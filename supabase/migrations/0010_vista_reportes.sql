-- ===========================================================
-- 0010_vista_reportes.sql
--
-- Extiende vista_actividad_reciente (creada en 0007) con el rol real de
-- la persona, para la pantalla de Reportes — cambio aditivo, el Dashboard
-- sigue funcionando igual, solo ignora la columna nueva.
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
  cp.url_evidencia_devolucion,
  uu.rol as persona_rol
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
