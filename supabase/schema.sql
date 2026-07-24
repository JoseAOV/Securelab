-- ===========================================================
-- SecureLab — Esquema de base de datos (Supabase / Postgres)
-- Extraído manualmente de information_schema.columns el 2026-07-22.
-- Este archivo documenta la forma de las tablas; no incluye
-- constraints, defaults, RLS policies ni foreign keys explícitas
-- (no se consultaron esos catálogos), pero se infieren por nombre
-- donde es evidente (columnas *_id -> uuid referenciando otra tabla).
-- ===========================================================

-- Activos físicos (laptops, cámaras, etc.) que se prestan.
create table activos (
  id                   uuid primary key,
  nombre               text not null,
  descripcion          text,
  rfid_tag             varchar not null,
  estado               text,              -- 'en_laboratorio' | 'en_prestamo' | 'en_mantenimiento' | ...
  ubicacion            varchar,
  prestamo_habilitado  boolean,
  creado_en            timestamptz
);

-- Pases de salida / préstamos generados desde el Portal.
create table codigos_prestamo (
  id                          uuid primary key,
  matricula                   varchar,          -- FK lógica -> usuarios_universidad.matricula
  activo_id                   uuid,             -- FK lógica -> activos.id
  codigo_autorizacion         varchar not null,
  estado                      text,             -- 'solicitado' | 'activo' | 'devuelto' | ...
  expira_en                   timestamptz not null,
  url_evidencia_devolucion    text,
  creado_en                   timestamptz
);

-- Eventos crudos del hardware (PIR + RFID) en la puerta/arco.
-- NO está integrada todavía en el frontend (dashboard usa datos mock).
create table eventos_movimiento (
  id                uuid primary key,
  sensor_id         uuid,      -- FK lógica -> sensores_salida.id
  activo_id         uuid,      -- FK lógica -> activos.id
  direccion         text,      -- ej. 'entrada' | 'salida'
  alerta_disparada  boolean,
  "timestamp"       timestamptz
);

-- Resultados de reconocimiento facial asociados a un evento de movimiento.
-- Tampoco está integrada en el frontend todavía.
create table reconocimientos_faciales (
  id                   uuid primary key,
  evento_id            uuid,      -- FK lógica -> eventos_movimiento.id
  matricula_detectada  varchar,
  nivel_confianza      numeric,
  resultado            text not null,
  "timestamp"          timestamptz
);

-- Catálogo de sensores/puertas físicas.
create table sensores_salida (
  id         uuid primary key,
  ubicacion  text not null,
  tipo       text,
  estado     text
);

-- Padrón de usuarios (estudiantes/personal) de la universidad.
-- rol tiene un CHECK constraint (usuarios_universidad_rol_check) que solo
-- permite: 'estudiante', 'docente', 'administrativo', 'intendente', 'laboratorista'.
-- 'laboratorista' es el rol con acceso de administrador del sistema
-- (gestiona Inventario) — ver is_admin() en 0002_fix_admin_role.sql.
create table usuarios_universidad (
  matricula     varchar primary key,
  nombre        text not null,
  carrera       text,
  rol           text not null check (rol in ('estudiante', 'docente', 'administrativo', 'intendente', 'laboratorista')),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  creado_en     timestamptz
);

-- ===========================================================
-- Vistas
-- ===========================================================

-- Alimenta el Dashboard (ActivosService.getActivosPrestados).
create view vista_activos_prestados as
select
  equipo,           -- text  (probablemente activos.nombre)
  rfid_tag,         -- varchar
  estudiante,       -- text  (probablemente usuarios_universidad.nombre)
  matricula,        -- varchar
  fecha_de_salida   -- timestamptz
from activos
  -- join con codigos_prestamo / usuarios_universidad (definición real no confirmada)
;
