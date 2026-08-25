-- ============================================================
-- Banco Nacional de Buenas Aguas — 0003_functions.sql
-- Funciones RPC (SECURITY DEFINER) — toda la lógica de dinero
-- vive aquí, nunca en el cliente.
-- ============================================================

-- ---------- 1. transferir ----------
create or replace function transferir(
  destino_cuenta text,
  cantidad numeric,
  concepto text default null
)
returns transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  emisor_id uuid := auth.uid();
  receptor profiles%rowtype;
  emisor profiles%rowtype;
  gastado_hoy numeric;
  nueva_tx transactions%rowtype;
begin
  if cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select * into emisor from profiles where id = emisor_id for update;
  if emisor is null then
    raise exception 'Cuenta emisora no encontrada';
  end if;
  if emisor.status = 'congelada' then
    raise exception 'Tu cuenta está congelada';
  end if;

  select * into receptor from profiles where account_number = destino_cuenta for update;
  if receptor is null then
    raise exception 'La cuenta destino no existe';
  end if;
  if receptor.status = 'congelada' then
    raise exception 'La cuenta destino está congelada';
  end if;
  if receptor.id = emisor_id then
    raise exception 'No puedes transferirte a ti mismo';
  end if;

  if emisor.balance < cantidad then
    raise exception 'Saldo insuficiente';
  end if;

  if emisor.transfer_limit_per_tx is not null and cantidad > emisor.transfer_limit_per_tx then
    raise exception 'Supera el límite por transferencia (%)', emisor.transfer_limit_per_tx;
  end if;

  if emisor.transfer_limit_daily is not null then
    select coalesce(sum(amount), 0) into gastado_hoy
    from transactions
    where from_account = emisor_id
      and type = 'transferencia'
      and created_at >= date_trunc('day', now());
    if gastado_hoy + cantidad > emisor.transfer_limit_daily then
      raise exception 'Supera el límite diario de transferencias (%)', emisor.transfer_limit_daily;
    end if;
  end if;

  update profiles set balance = balance - cantidad where id = emisor_id;
  update profiles set balance = balance + cantidad where id = receptor.id;

  insert into transactions (from_account, to_account, amount, type, description, created_by)
  values (emisor_id, receptor.id, cantidad, 'transferencia', concepto, emisor_id)
  returning * into nueva_tx;

  return nueva_tx;
end;
$$;

-- ---------- 2. cobrar_salario ----------
create or replace function cobrar_salario()
returns transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p profiles%rowtype;
  proximo timestamptz;
  nueva_tx transactions%rowtype;
begin
  select * into p from profiles where id = uid for update;
  if p is null then
    raise exception 'Perfil no encontrado';
  end if;

  if p.last_salary_collected_at is not null then
    proximo := p.last_salary_collected_at + make_interval(days => p.salary_frequency_days);
    if now() < proximo then
      raise exception 'Todavía no puedes cobrar. Próximo cobro disponible: %', proximo;
    end if;
  end if;

  if p.salary_amount <= 0 then
    raise exception 'No tienes un salario configurado';
  end if;

  update profiles
    set balance = balance + p.salary_amount,
        last_salary_collected_at = now()
    where id = uid;

  insert into transactions (from_account, to_account, amount, type, description, created_by)
  values (null, uid, p.salary_amount, 'salario', 'Cobro de salario', uid)
  returning * into nueva_tx;

  return nueva_tx;
end;
$$;

-- ---------- 3. solicitar_prestamo ----------
create or replace function solicitar_prestamo(
  cantidad numeric,
  cuotas int
)
returns loans
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nuevo_prestamo loans%rowtype;
begin
  if cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;
  if cuotas < 1 then
    raise exception 'El número de cuotas debe ser al menos 1';
  end if;

  insert into loans (account_id, principal, interest_rate, installments, remaining_balance, status)
  values (uid, cantidad, 0, cuotas, cantidad, 'pendiente')
  returning * into nuevo_prestamo;

  return nuevo_prestamo;
end;
$$;

-- ---------- 4. aprobar_prestamo (solo admin) ----------
create or replace function aprobar_prestamo(
  loan_id uuid,
  interest_rate numeric default 0
)
returns loans
language plpgsql
security definer
set search_path = public
as $$
declare
  l loans%rowtype;
  total numeric;
  cuota numeric;
begin
  if not is_admin() then
    raise exception 'Solo el admin puede aprobar préstamos';
  end if;

  select * into l from loans where id = loan_id for update;
  if l is null then
    raise exception 'Préstamo no encontrado';
  end if;
  if l.status <> 'pendiente' then
    raise exception 'El préstamo ya fue procesado';
  end if;

  total := l.principal * (1 + interest_rate / 100.0);
  cuota := round(total / l.installments, 2);

  update loans
    set status = 'activo',
        interest_rate = aprobar_prestamo.interest_rate,
        installment_amount = cuota,
        remaining_balance = total,
        approved_at = now(),
        next_due_at = now() + interval '7 days'
    where id = loan_id
    returning * into l;

  update profiles set balance = balance + l.principal where id = l.account_id;

  insert into transactions (from_account, to_account, amount, type, description, created_by)
  values (null, l.account_id, l.principal, 'prestamo_desembolso', 'Desembolso de préstamo', auth.uid());

  return l;
end;
$$;

-- ---------- 4b. rechazar_prestamo (solo admin) ----------
create or replace function rechazar_prestamo(loan_id uuid)
returns loans
language plpgsql
security definer
set search_path = public
as $$
declare
  l loans%rowtype;
begin
  if not is_admin() then
    raise exception 'Solo el admin puede rechazar préstamos';
  end if;

  update loans set status = 'rechazado'
    where id = loan_id and status = 'pendiente'
    returning * into l;

  if l is null then
    raise exception 'Préstamo no encontrado o ya procesado';
  end if;

  return l;
end;
$$;

-- ---------- 5. pagar_cuota_prestamo ----------
create or replace function pagar_cuota_prestamo(loan_id uuid)
returns loans
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  l loans%rowtype;
  p profiles%rowtype;
  importe numeric;
begin
  select * into l from loans where id = loan_id for update;
  if l is null then
    raise exception 'Préstamo no encontrado';
  end if;
  if l.account_id <> uid then
    raise exception 'Este préstamo no te pertenece';
  end if;
  if l.status <> 'activo' then
    raise exception 'El préstamo no está activo';
  end if;

  select * into p from profiles where id = uid for update;
  importe := least(l.installment_amount, l.remaining_balance);

  if p.balance < importe then
    raise exception 'Saldo insuficiente para pagar la cuota';
  end if;

  update profiles set balance = balance - importe where id = uid;

  insert into loan_payments (loan_id, amount) values (loan_id, importe);
  insert into transactions (from_account, to_account, amount, type, description, created_by)
  values (uid, null, importe, 'prestamo_cuota', 'Pago de cuota de préstamo', uid);

  update loans
    set remaining_balance = remaining_balance - importe,
        status = case when remaining_balance - importe <= 0 then 'pagado' else 'activo' end,
        next_due_at = case when remaining_balance - importe <= 0 then null else now() + interval '7 days' end
    where id = loan_id
    returning * into l;

  return l;
end;
$$;

-- ---------- 6. aplicar_impuesto ----------
create or replace function aplicar_impuesto(tax_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t taxes%rowtype;
  cuenta profiles%rowtype;
  importe numeric;
  admin_id uuid := auth.uid();
begin
  select * into t from taxes where id = tax_id for update;
  if t is null then
    raise exception 'Impuesto no encontrado';
  end if;

  for cuenta in
    select * from profiles
    where status = 'activa'
      and (t.target = 'todos' or id = any(t.target_accounts))
  loop
    if t.mode = 'porcentaje' then
      importe := round(cuenta.balance * t.value / 100.0, 2);
    else
      importe := t.value;
    end if;

    if importe > 0 then
      update profiles set balance = greatest(balance - importe, 0) where id = cuenta.id;
      insert into transactions (from_account, to_account, amount, type, description, created_by)
      values (cuenta.id, null, importe, 'impuesto', t.name, admin_id);
    end if;
  end loop;

  update taxes set last_applied_at = now() where id = tax_id;
end;
$$;

-- ---------- 7. aplicar_interes_ahorro (cron diario) ----------
create or replace function aplicar_interes_ahorro()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg savings_config%rowtype;
  cuenta profiles%rowtype;
  interes numeric;
  toca boolean;
begin
  select * into cfg from savings_config where id = 1 for update;
  if cfg is null or not cfg.active then
    return;
  end if;

  toca := cfg.last_applied_at is null
    or now() >= cfg.last_applied_at + make_interval(days => cfg.frequency_days);

  if not toca then
    return;
  end if;

  for cuenta in select * from profiles where savings_balance > 0 loop
    interes := round(cuenta.savings_balance * cfg.interest_rate / 100.0, 2);
    if interes > 0 then
      update profiles set savings_balance = savings_balance + interes where id = cuenta.id;
      insert into transactions (from_account, to_account, amount, type, description, created_by)
      values (null, cuenta.id, interes, 'interes_ahorro', 'Interés de ahorro', null);
    end if;
  end loop;

  update savings_config set last_applied_at = now() where id = 1;
end;
$$;

-- ---------- 7b. mover_a_ahorro / mover_de_ahorro ----------
create or replace function mover_a_ahorro(cantidad numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;
  update profiles set balance = balance - cantidad, savings_balance = savings_balance + cantidad
    where id = uid and balance >= cantidad;
  if not found then
    raise exception 'Saldo insuficiente en cuenta corriente';
  end if;
end;
$$;

create or replace function mover_de_ahorro(cantidad numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;
  update profiles set balance = balance + cantidad, savings_balance = savings_balance - cantidad
    where id = uid and savings_balance >= cantidad;
  if not found then
    raise exception 'Saldo insuficiente en ahorro';
  end if;
end;
$$;

-- ---------- 8. ajustar_saldo (solo admin) ----------
create or replace function ajustar_saldo(
  cuenta uuid,
  cantidad numeric,
  motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Solo el admin puede ajustar saldos';
  end if;

  update profiles set balance = balance + cantidad where id = cuenta;
  if not found then
    raise exception 'Cuenta no encontrada';
  end if;

  insert into transactions (from_account, to_account, amount, type, description, created_by)
  values (
    case when cantidad < 0 then cuenta else null end,
    case when cantidad >= 0 then cuenta else null end,
    abs(cantidad), 'ajuste_manual', motivo, auth.uid()
  );
end;
$$;

-- ---------- 9. congelar / descongelar cuenta (solo admin) ----------
create or replace function set_estado_cuenta(cuenta uuid, nuevo_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Solo el admin puede cambiar el estado de una cuenta';
  end if;
  if nuevo_estado not in ('activa', 'congelada') then
    raise exception 'Estado inválido';
  end if;
  update profiles set status = nuevo_estado where id = cuenta;
end;
$$;

-- ---------- 10. crear_usuario (solo admin, vía Edge Function con service role) ----------
-- Esta función NO crea el usuario de Auth (eso requiere la service role key,
-- solo disponible del lado servidor). Se invoca desde la Edge Function
-- `crear-usuario` tras crear el auth.users con supabase.auth.admin.createUser().
create or replace function crear_perfil(
  user_id uuid,
  p_full_name text,
  p_account_number text,
  p_salary_amount numeric default 0,
  p_salary_frequency_days int default 7,
  p_transfer_limit_per_tx numeric default null,
  p_transfer_limit_daily numeric default null
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo profiles%rowtype;
begin
  insert into profiles (
    id, account_number, full_name, salary_amount,
    salary_frequency_days, transfer_limit_per_tx, transfer_limit_daily
  ) values (
    user_id, p_account_number, p_full_name, p_salary_amount,
    p_salary_frequency_days, p_transfer_limit_per_tx, p_transfer_limit_daily
  )
  returning * into nuevo;

  return nuevo;
end;
$$;
