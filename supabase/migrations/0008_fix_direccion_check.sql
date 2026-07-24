-- ===========================================================
-- 0008_fix_direccion_check.sql
--
-- eventos_movimiento.direccion tenía un CHECK heredado que solo permitía
-- 'salida_lab' / 'salida_edificio' (pensado para un campus con varios
-- puntos de control) y no permitía 'entrada' en absoluto. El proyecto es
-- de un solo laboratorio (ver decisión en 0001), y procesar_cruce_puerta
-- ya usa 'entrada'/'salida' — se ajusta la restricción para que coincida.
-- ===========================================================

alter table eventos_movimiento
  drop constraint eventos_movimiento_direccion_check;

alter table eventos_movimiento
  add constraint eventos_movimiento_direccion_check
  check (direccion = any (array['entrada'::text, 'salida'::text]));
