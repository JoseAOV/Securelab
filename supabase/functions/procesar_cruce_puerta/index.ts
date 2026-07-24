import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Payload {
  rfid_tag: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sensor único sembrado en la migración 0001_auth_and_rls.sql (single-lab por ahora).
const SENSOR_ID = '00000000-0000-0000-0000-000000000001';

Deno.serve(async (req) => {
  // Manejo de pre-flight CORS para el ESP32
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente de Supabase con permisos de administrador (Secret Key nueva).
    // Supabase inyecta SUPABASE_SECRET_KEYS (JSON) y SUPABASE_URL automáticamente
    // en cada Edge Function desplegada: no deben hardcodearse en el código fuente.
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      secretKeys['default']
    )

    // Extraer el tag RFID del cuerpo de la petición HTTP
    const { rfid_tag } = await req.json() as Payload;
    if (!rfid_tag) throw new Error("Se requiere el rfid_tag");

    // ---------------------------------------------------------
    // PASO 1: Identificar el Activo Físico
    // ---------------------------------------------------------
    const { data: activo, error: errorActivo } = await supabaseClient
      .from('activos')
      .select('*')
      .eq('rfid_tag', rfid_tag)
      .single();

    if (errorActivo) {
      console.error('Error al consultar activos:', JSON.stringify(errorActivo));
    }

    if (errorActivo || !activo) {
      return new Response(JSON.stringify({ accion: 'bloqueado', mensaje: 'Tag RFID no pertenece a ningún equipo registrado.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Registra el cruce en eventos_movimiento y devuelve el id de la fila creada,
    // para poder referenciarla desde reconocimientos_faciales cuando aplique.
    const registrarEvento = async (direccion: 'entrada' | 'salida', alertaDisparada: boolean) => {
      const { data: evento, error: errorEvento } = await supabaseClient
        .from('eventos_movimiento')
        .insert({
          sensor_id: SENSOR_ID,
          activo_id: activo.id,
          direccion,
          alerta_disparada: alertaDisparada,
        })
        .select()
        .single();

      if (errorEvento) {
        console.error('Error al insertar en eventos_movimiento:', JSON.stringify(errorEvento));
      }

      return evento?.id ?? null;
    };

    // ---------------------------------------------------------
    // RAMA 1: ¿El equipo ya está en préstamo? (Flujo de Devolución)
    // ---------------------------------------------------------
    const { data: prestamoActivo } = await supabaseClient
      .from('codigos_prestamo')
      .select('*')
      .eq('activo_id', activo.id)
      .eq('estado', 'activo')
      .single();

    if (prestamoActivo) {
      if (prestamoActivo.url_evidencia_devolucion) {
        // SÍ: Cerramos el préstamo porque ya hay foto
        await supabaseClient.from('codigos_prestamo').update({ estado: 'devuelto' }).eq('id', prestamoActivo.id);

        await supabaseClient.from('activos').update({
        estado: 'en_laboratorio'}).eq('id', activo.id);

        await registrarEvento('entrada', false);

        return new Response(JSON.stringify({ accion: 'permitido', mensaje: 'Devolución completada. Luz Verde.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        // NO: Falta foto. Se requiere acción en la app.
        await registrarEvento('entrada', false);

        return new Response(JSON.stringify({ accion: 'neutral', mensaje: 'Falta evidencia. Revisa tu app.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ---------------------------------------------------------
    // RAMA 2: El equipo NO está en préstamo. (Flujo de Salida o Robo)
    // ---------------------------------------------------------
    const { data: solicitudVigente } = await supabaseClient
      .from('codigos_prestamo')
      .select('*')
      .eq('activo_id', activo.id)
      .eq('estado', 'solicitado')
      .gt('expira_en', new Date().toISOString())
      .single();

    if (solicitudVigente) {
      // LEGAL: Hay solicitud vigente
      await supabaseClient.from('codigos_prestamo').update({ estado: 'activo' }).eq('id', solicitudVigente.id);

      await supabaseClient.from('activos').update({
        estado: 'en_prestamo'}).eq('id', activo.id);

      await registrarEvento('salida', false);

      return new Response(JSON.stringify({ accion: 'permitido', mensaje: 'Préstamo iniciado. Luz Verde.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // ILEGAL: Salida sin permiso. Detección de anomalía.
      const eventoId = await registrarEvento('salida', true);

      await supabaseClient.from('reconocimientos_faciales').insert([{
        evento_id: eventoId,
        resultado: 'captura_requerida'
      }]);

      return new Response(JSON.stringify({ accion: 'bloqueado', mensaje: '¡Alarma! Salida no autorizada.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
});
