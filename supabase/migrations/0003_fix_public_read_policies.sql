-- ===========================================================
-- 0003_fix_public_read_policies.sql
--
-- Hallazgo: bajo el sistema de claves nuevo de Supabase, una solicitud que
-- solo trae la clave pública (sin sesión real) igual satisface "to
-- authenticated" en las policies (a diferencia del sistema legacy, donde
-- eso resolvía a 'anon'). Las policies que usaban `using (true)` quedaron
-- efectivamente públicas: activos y sensores_salida podían leerse sin
-- haber iniciado sesión. Las demás policies (que dependen de auth.uid()
-- vía is_admin() o comparando matricula) no se ven afectadas, porque
-- auth.uid() sigue siendo NULL sin una sesión real.
--
-- Fix: reemplazar `using (true)` por `using (auth.uid() is not null)`,
-- que sí distingue una sesión real de una simple llamada con la clave
-- pública.
-- ===========================================================

drop policy if exists "activos_select_authenticated" on activos;
create policy "activos_select_authenticated"
  on activos for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "sensores_salida_select_authenticated" on sensores_salida;
create policy "sensores_salida_select_authenticated"
  on sensores_salida for select
  to authenticated
  using (auth.uid() is not null);
