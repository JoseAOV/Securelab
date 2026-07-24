-- ===========================================================
-- 0009_personal_gestion.sql
--
-- Permite al laboratorista editar/banear/eliminar personas desde la app
-- (antes solo se podía crear). El baneo es reversible y se aplica en el
-- login/guard del cliente; el borrado real de la cuenta de Auth se hace
-- en la Edge Function eliminar_persona (necesita la Admin API vía Secret
-- Key, no se puede hacer desde el cliente).
-- ===========================================================

alter table usuarios_universidad
  add column if not exists baneado boolean not null default false;

create policy "usuarios_universidad_update_admin"
  on usuarios_universidad for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "usuarios_universidad_delete_admin"
  on usuarios_universidad for delete
  to authenticated
  using (is_admin());
