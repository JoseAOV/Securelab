-- ===========================================================
-- 0004_drop_dev_allow_all_policy.sql
--
-- Hallazgo crítico: las 6 tablas tenían una política heredada
-- "Permitir todo en desarrollo" (rol `public`, `ALL`, `USING (true)`),
-- creada antes de este trabajo de RLS. En Postgres, cuando existen varias
-- policies para el mismo comando, basta con que UNA lo permita — así que
-- esta política anulaba por completo todas las restricciones de
-- 0001/0002/0003: cualquiera, sin sesión, podía leer y escribir cualquier
-- tabla. Se elimina para que las policies específicas por rol sean las
-- únicas que apliquen.
-- ===========================================================

drop policy if exists "Permitir todo en desarrollo" on activos;
drop policy if exists "Permitir todo en desarrollo" on codigos_prestamo;
drop policy if exists "Permitir todo en desarrollo" on eventos_movimiento;
drop policy if exists "Permitir todo en desarrollo" on reconocimientos_faciales;
drop policy if exists "Permitir todo en desarrollo" on sensores_salida;
drop policy if exists "Permitir todo en desarrollo" on usuarios_universidad;
