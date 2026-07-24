-- ===========================================================
-- 0006_gestion_personal.sql
--
-- El laboratorista ahora registra personas (matrícula, nombre, rol) desde
-- la app en vez de que se haga por SQL manual. Por eso:
-- 1. handle_new_user() ya no necesita leer/escribir "nombre" desde los
--    metadatos del signup — el nombre ya existe en la fila precargada por
--    el laboratorista. Solo vincula auth_user_id.
-- 2. Se agrega una policy de INSERT en usuarios_universidad gateada por
--    is_admin(), para que el laboratorista pueda crear esas filas desde
--    el cliente.
-- ===========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula text := new.raw_user_meta_data->>'matricula';
begin
  if v_matricula is null then
    return new;
  end if;

  update usuarios_universidad
  set auth_user_id = new.id
  where matricula = v_matricula
    and auth_user_id is null;

  if not found then
    raise exception 'Matrícula inválida o ya registrada';
  end if;

  return new;
end;
$$;

create policy "usuarios_universidad_insert_admin"
  on usuarios_universidad for insert
  to authenticated
  with check (is_admin());
