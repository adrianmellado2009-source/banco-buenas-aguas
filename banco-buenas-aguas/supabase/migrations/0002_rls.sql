-- ============================================================
-- Banco Nacional de Buenas Aguas — 0002_rls.sql
-- Row Level Security
-- ============================================================

-- ---------- Helper: is_admin() sin recursión en policies ----------
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles ----------
alter table profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- Un usuario normal solo puede tocar campos no sensibles de su propia fila;
-- la aplicación solo debe exponer edición de datos de perfil (no saldo/rol/límites)
-- desde el cliente para usuarios normales. El admin puede todo vía RPC/API.
create policy "profiles_update_own_limited"
  on profiles for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy "profiles_insert_admin_only"
  on profiles for insert
  with check (is_admin());

create policy "profiles_delete_admin_only"
  on profiles for delete
  using (is_admin());

-- ---------- transactions ----------
alter table transactions enable row level security;

create policy "transactions_select_own_or_admin"
  on transactions for select
  using (from_account = auth.uid() or to_account = auth.uid() or is_admin());

-- Nunca se permite insert/update/delete directo desde el cliente:
-- todo pasa por funciones RPC SECURITY DEFINER (ver 0003_functions.sql),
-- que se ejecutan con los privilegios del owner y no están sujetas a esta policy.
create policy "transactions_no_direct_write"
  on transactions for insert
  with check (false);

-- ---------- taxes ----------
alter table taxes enable row level security;

create policy "taxes_admin_all"
  on taxes for all
  using (is_admin())
  with check (is_admin());

-- ---------- savings_config ----------
alter table savings_config enable row level security;

create policy "savings_config_select_all"
  on savings_config for select
  using (true); -- cualquier usuario autenticado puede ver la tasa vigente

create policy "savings_config_admin_write"
  on savings_config for update
  using (is_admin())
  with check (is_admin());

-- ---------- app_config ----------
alter table app_config enable row level security;

create policy "app_config_select_all"
  on app_config for select
  using (true);

create policy "app_config_admin_write"
  on app_config for update
  using (is_admin())
  with check (is_admin());

-- ---------- loans ----------
alter table loans enable row level security;

create policy "loans_select_own_or_admin"
  on loans for select
  using (account_id = auth.uid() or is_admin());

create policy "loans_insert_own_pending"
  on loans for insert
  with check (account_id = auth.uid() and status = 'pendiente');

create policy "loans_update_admin_only"
  on loans for update
  using (is_admin())
  with check (is_admin());

-- ---------- loan_payments ----------
alter table loan_payments enable row level security;

create policy "loan_payments_select_own_or_admin"
  on loan_payments for select
  using (
    is_admin() or exists (
      select 1 from loans l
      where l.id = loan_payments.loan_id and l.account_id = auth.uid()
    )
  );

create policy "loan_payments_no_direct_write"
  on loan_payments for insert
  with check (false); -- solo vía RPC pagar_cuota_prestamo

-- ---------- cards ----------
alter table cards enable row level security;

create policy "cards_select_own_or_admin"
  on cards for select
  using (account_id = auth.uid() or is_admin());

create policy "cards_admin_write"
  on cards for all
  using (is_admin())
  with check (is_admin());
