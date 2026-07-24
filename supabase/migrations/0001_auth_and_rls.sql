-- ===========================================================
-- 0001_auth_and_rls.sql
-- Vincula usuarios_universidad con Supabase Auth, agrega el
-- placeholder de foto para reconocimiento facial, y habilita
-- RLS con políticas por rol en las 6 tablas de SecureLab.
-- ===========================================================

-- ---------------------------------------------------------
-- 1. Columnas nuevas
-- ---------------------------------------------------------
alter table usuarios_universidad
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table reconocimientos_faciales
  add column if not exists url_foto text;

-- ---------------------------------------------------------
-- 2. Helper is_admin(): security definer para evitar RLS
--    recursivo al consultar usuarios_universidad desde las
--    policies de las demás tablas.
-- ---------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from usuarios_universidad
    where auth_user_id = auth.uid() and rol = 'admin'
  );
$$;

-- ---------------------------------------------------------
-- 3. Habilitar RLS en todas las tablas
-- ---------------------------------------------------------
alter table activos enable row level security;
alter table codigos_prestamo enable row level security;
alter table eventos_movimiento enable row level security;
alter table reconocimientos_faciales enable row level security;
alter table sensores_salida enable row level security;
alter table usuarios_universidad enable row level security;

-- ---------------------------------------------------------
-- 4. Policies: activos
--    Lectura para cualquier usuario logueado; escritura solo admin.
-- ---------------------------------------------------------
create policy "activos_select_authenticated"
  on activos for select
  to authenticated
  using (true);

create policy "activos_insert_admin"
  on activos for insert
  to authenticated
  with check (is_admin());

create policy "activos_update_admin"
  on activos for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "activos_delete_admin"
  on activos for delete
  to authenticated
  using (is_admin());

-- ---------------------------------------------------------
-- 5. Policies: codigos_prestamo
--    El estudiante ve/crea sus propios pases; el cambio de estado
--    ('solicitado' -> 'activo' -> 'devuelto') lo hace exclusivamente
--    la Edge Function con la service_role key (ignora RLS), por eso
--    a propósito no hay policy de UPDATE para 'authenticated'.
-- ---------------------------------------------------------
create policy "codigos_prestamo_select_owner_or_admin"
  on codigos_prestamo for select
  to authenticated
  using (
    is_admin()
    or matricula = (select matricula from usuarios_universidad where auth_user_id = auth.uid())
  );

create policy "codigos_prestamo_insert_owner"
  on codigos_prestamo for insert
  to authenticated
  with check (
    matricula = (select matricula from usuarios_universidad where auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------
-- 6. Policies: eventos_movimiento / reconocimientos_faciales
--    Solo lectura para admin. Solo la Edge Function (service_role)
--    inserta, por eso no hay policies de insert/update para clientes.
-- ---------------------------------------------------------
create policy "eventos_movimiento_select_admin"
  on eventos_movimiento for select
  to authenticated
  using (is_admin());

create policy "reconocimientos_faciales_select_admin"
  on reconocimientos_faciales for select
  to authenticated
  using (is_admin());

-- ---------------------------------------------------------
-- 7. Policies: sensores_salida
--    Tabla de referencia pequeña, lectura para cualquier logueado.
-- ---------------------------------------------------------
create policy "sensores_salida_select_authenticated"
  on sensores_salida for select
  to authenticated
  using (true);

-- ---------------------------------------------------------
-- 8. Policies: usuarios_universidad
--    Cada quien ve su propia fila; admin ve todas.
-- ---------------------------------------------------------
create policy "usuarios_universidad_select_own_or_admin"
  on usuarios_universidad for select
  to authenticated
  using (auth_user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------
-- 9. Seed: un solo sensor/puerta (single-lab por ahora)
-- ---------------------------------------------------------
insert into sensores_salida (id, ubicacion, tipo, estado)
values ('00000000-0000-0000-0000-000000000001', 'Laboratorio TI - Principal', 'RFID+PIR', 'activo')
on conflict (id) do nothing;
