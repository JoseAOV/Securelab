import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Payload {
  matricula: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      secretKeys['default']
    );

    // ---------------------------------------------------------
    // PASO 1: Verificar que quien llama es un laboratorista real.
    // El gateway ya exige un JWT válido (esta función se despliega SIN
    // --no-verify-jwt), pero eso solo confirma "hay sesión", no que sea
    // admin — ese chequeo lo hacemos aquí explícitamente.
    // ---------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerJwt = authHeader.replace('Bearer ', '');

    const { data: { user: caller }, error: errorCaller } = await supabaseAdmin.auth.getUser(callerJwt);
    if (errorCaller || !caller) {
      return new Response(JSON.stringify({ error: 'No autenticado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: perfilCaller } = await supabaseAdmin
      .from('usuarios_universidad')
      .select('matricula, rol')
      .eq('auth_user_id', caller.id)
      .single();

    if (perfilCaller?.rol !== 'laboratorista') {
      return new Response(JSON.stringify({ error: 'No autorizado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // ---------------------------------------------------------
    // PASO 2: Leer y validar el body.
    // ---------------------------------------------------------
    const { matricula } = await req.json() as Payload;
    if (!matricula) throw new Error('Se requiere la matrícula.');

    if (matricula === perfilCaller.matricula) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar tu propia cuenta.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // ---------------------------------------------------------
    // PASO 3: Borrar la cuenta de Auth de verdad (si existe) y la fila.
    // ---------------------------------------------------------
    const { data: persona, error: errorPersona } = await supabaseAdmin
      .from('usuarios_universidad')
      .select('auth_user_id')
      .eq('matricula', matricula)
      .single();

    if (errorPersona || !persona) {
      return new Response(JSON.stringify({ error: 'Esa matrícula no existe.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    if (persona.auth_user_id) {
      const { error: errorAuthDelete } = await supabaseAdmin.auth.admin.deleteUser(persona.auth_user_id);
      if (errorAuthDelete) {
        console.error('Error al eliminar la cuenta de Auth:', JSON.stringify(errorAuthDelete));
        throw errorAuthDelete;
      }
    }

    const { error: errorDelete } = await supabaseAdmin
      .from('usuarios_universidad')
      .delete()
      .eq('matricula', matricula);

    if (errorDelete) {
      console.error('Error al eliminar la fila de usuarios_universidad:', JSON.stringify(errorDelete));
      throw errorDelete;
    }

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
});
