-- ===========================================================
-- 0007_actividad_reciente.sql
--
-- Vista unificada para el feed en vivo del Dashboard: junta cada evento de
-- movimiento con el activo, quién lo hizo (reconocimiento facial si fue
-- una alerta, o el préstamo más reciente de ese activo si fue legal), y la
-- evidencia de devolución si aplica.
--
-- security_invoker = true es importante: sin esto, la vista se ejecuta con
-- los permisos del dueño (bypassea RLS), lo que expondría datos de
-- eventos_movimiento/reconocimientos_faciales (admin-only) a cualquier
-- usuario autenticado. Con security_invoker, hereda el RLS real de quien
-- consulta.
-- ===========================================================

create or replace view vista_actividad_reciente
with (security_invoker = true) as
select
  em.id as evento_id,
  em.timestamp,
  em.direccion,
  em.alerta_disparada,
  a.nombre as equipo,
  a.rfid_tag,
  coalesce(rf.matricula_detectada, cp.matricula) as matricula_persona,
  uu.nombre as persona_nombre,
  cp.url_evidencia_devolucion
from eventos_movimiento em
join activos a on a.id = em.activo_id
left join reconocimientos_faciales rf on rf.evento_id = em.id
left join lateral (
  select matricula, url_evidencia_devolucion
  from codigos_prestamo
  where activo_id = em.activo_id
  order by creado_en desc
  limit 1
) cp on true
left join usuarios_universidad uu on uu.matricula = coalesce(rf.matricula_detectada, cp.matricula)
order by em.timestamp desc;

-- Habilita Realtime (postgres_changes) sobre eventos_movimiento para que
-- el Dashboard pueda escuchar INSERTs en vivo. Realtime respeta el RLS de
-- la tabla, así que solo laboratorista recibirá estos eventos.
alter publication supabase_realtime add table eventos_movimiento;
