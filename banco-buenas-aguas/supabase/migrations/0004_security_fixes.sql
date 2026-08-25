-- ============================================================
-- Banco Nacional de Buenas Aguas — 0004_security_fixes.sql
-- Cierra dos huecos de seguridad encontrados en revisión:
--   1. Un usuario normal podía escribir cualquier columna de su
--      propia fila en `profiles` (balance, role, límites...) vía
--      la API REST directa, saltándose las funciones RPC.
--   2. `aplicar_impuesto` y `crear_perfil` no comprobaban is_admin()
--      y eran invocables por cualquier usuario autenticado vía RPC.
-- ============================================================

-- ---------- 1. Restringir columnas editables directamente en profiles ----------
-- El admin sigue pudiendo todo porque sus escrituras pasan por funciones
-- SECURITY DEFINER (que no dependen de estos grants de columna).
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

-- ---------- 2. aplicar_impuesto: añadir comprobación de admin ----------
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
  if not is_admin() then
    raise exception 'Solo el admin puede aplicar impuestos';
  end if;

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

-- ---------- 3. crear_perfil: restringir a service_role únicamente ----------
-- Solo la Edge Function `crear-usuario` (que usa la service role key)
-- debe poder llamarla. No necesita comprobar is_admin() porque ningún
-- usuario autenticado normal podrá invocarla en absoluto.
revoke execute on function crear_perfil(uuid, text, text, numeric, int, numeric, numeric)
  from public, authenticated, anon;
grant execute on function crear_perfil(uuid, text, text, numeric, int, numeric, numeric)
  to service_role;
