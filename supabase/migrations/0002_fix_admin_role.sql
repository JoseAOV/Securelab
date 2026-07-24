-- ===========================================================
-- 0002_fix_admin_role.sql
-- La tabla usuarios_universidad tiene un CHECK constraint que solo
-- permite: estudiante, docente, administrativo, intendente, laboratorista.
-- 'admin' no es un valor válido. El rol equivalente a administrador
-- del sistema (gestiona el inventario) es 'laboratorista'.
-- ===========================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from usuarios_universidad
    where auth_user_id = auth.uid() and rol = 'laboratorista'
  );
$$;
