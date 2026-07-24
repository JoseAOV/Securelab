-- ===========================================================
-- 0005_registro_por_matricula.sql
--
-- Flujo de autoregistro: un estudiante/personal ya existe como fila en
-- usuarios_universidad (cargada por un admin), pero sin auth_user_id.
-- Registrarse "reclama" esa fila, no crea una nueva.
--
-- La validación y el vínculo se hacen en un trigger sobre auth.users
-- (security definer, corre como dueño de la tabla) en vez de una policy
-- de UPDATE llamada desde el cliente — así el cliente nunca tiene permiso
-- de UPDATE directo sobre usuarios_universidad, y no hay forma de que un
-- payload manipulado cambie `rol` u otras columnas al "reclamar" una fila.
-- ===========================================================

-- ---------------------------------------------------------
-- 1. Chequeo rápido de disponibilidad (solo lectura, para UX en el form).
--    No es la garantía real de seguridad — el trigger de abajo sí lo es.
-- ---------------------------------------------------------
create or replace function matricula_disponible(p_matricula text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from usuarios_universidad
    where matricula = p_matricula and auth_user_id is null
  );
$$;

grant execute on function matricula_disponible(text) to anon, authenticated;

-- ---------------------------------------------------------
-- 2. Trigger que reclama la fila al crearse la cuenta de Auth.
--    Si raw_user_meta_data no trae 'matricula' (ej. un admin creando un
--    usuario manualmente desde el Dashboard), no hace nada.
--    Si trae matricula pero no existe o ya está reclamada, revierte la
--    creación completa del usuario (no queda una cuenta huérfana).
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula text := new.raw_user_meta_data->>'matricula';
  v_nombre text := new.raw_user_meta_data->>'nombre';
begin
  if v_matricula is null then
    return new;
  end if;

  update usuarios_universidad
  set auth_user_id = new.id,
      nombre = coalesce(v_nombre, nombre)
  where matricula = v_matricula
    and auth_user_id is null;

  if not found then
    raise exception 'Matrícula inválida o ya registrada';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
