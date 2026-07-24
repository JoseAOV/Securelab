# Reconocimiento facial — Edge Function + ESP32 con GoPro por USB

## Requisitos de hardware (obligatorio, no es un ESP32 cualquiera)

Una GoPro por USB **no es una webcam simple** — se conecta como dispositivo de
red virtual (RNDIS) y se controla con HTTP (API "Open GoPro", la misma que
usa por WiFi). Para hablar USB Host + RNDIS necesitas:

- **ESP32-S2 o ESP32-S3** (el ESP32 clásico/WROOM no tiene USB Host, no sirve).
- Proyecto en **ESP-IDF** (no Arduino IDE simple) + el componente
  [`iot_usbh_rndis`](https://components.espressif.com/components/espressif/iot_usbh_rndis)
  de Espressif.
- En la GoPro: pantalla → **Conexiones → Conexión USB → GoPro Connect**
  (activa el modo de control por USB).

## Parte 1 — Edge Function nueva: `procesar_reconocimiento_facial`

Crea `supabase/functions/procesar_reconocimiento_facial/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Payload {
  reconocimiento_id: string; // id de la fila en reconocimientos_faciales a resolver
  foto_base64: string;       // JPEG capturado por el ESP32, en base64
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UMBRAL_CONFIANZA = 90;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, secretKeys['default']);

    const { reconocimiento_id, foto_base64 } = await req.json() as Payload;
    if (!reconocimiento_id || !foto_base64) {
      throw new Error('Se requieren reconocimiento_id y foto_base64');
    }

    const fotoBytes = Uint8Array.from(atob(foto_base64), (c) => c.charCodeAt(0));

    // 1. Subir la foto a Storage (bucket "capturas_seguridad", créalo en el Dashboard)
    const nombreArchivo = `captura_${reconocimiento_id}.jpg`;
    const { error: errorUpload } = await supabaseClient.storage
      .from('capturas_seguridad')
      .upload(nombreArchivo, fotoBytes, { contentType: 'image/jpeg', upsert: true });
    if (errorUpload) throw new Error(`Error al subir foto: ${errorUpload.message}`);

    const { data: urlData } = supabaseClient.storage.from('capturas_seguridad').getPublicUrl(nombreArchivo);

    // 2. Comparar contra rostros conocidos — implementa esto con tu proveedor
    //    (AWS Rekognition SearchFacesByImage, Azure Face, etc.)
    const match = await buscarRostro(fotoBytes); // { faceId, confianza } | null

    let matricula: string | null = null;
    let resultado = 'no_identificado';

    if (match && match.confianza >= UMBRAL_CONFIANZA) {
      const { data: persona } = await supabaseClient
        .from('usuarios_universidad')
        .select('matricula')
        .eq('rostro_id', match.faceId)
        .single();
      if (persona) {
        matricula = persona.matricula;
        resultado = 'identificado';
      }
    }

    // 3. Actualizar exactamente la fila que el ESP32 nos indicó
    await supabaseClient
      .from('reconocimientos_faciales')
      .update({
        url_foto: urlData.publicUrl,
        matricula_detectada: matricula,
        nivel_confianza: match?.confianza ?? null,
        resultado,
      })
      .eq('id', reconocimiento_id);

    return new Response(JSON.stringify({ ok: true, resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

// TODO: implementar con el SDK/API REST de tu proveedor de reconocimiento facial.
async function buscarRostro(fotoBytes: Uint8Array): Promise<{ faceId: string; confianza: number } | null> {
  throw new Error('Falta implementar buscarRostro()');
}
```

Necesita también (nueva migración, ver patrón en `supabase/migrations/`):
```sql
alter table usuarios_universidad add column if not exists rostro_id text;
```

Desplegar: `npx supabase functions deploy procesar_reconocimiento_facial --no-verify-jwt`

## Parte 2 — Código C del ESP32 (ESP-IDF)

Lógica del `main.c`:
1. Conectar a WiFi (para hablar con Supabase) — igual que en
   `hardware-esp32/sketch_jun6a.ino`.
2. Inicializar USB Host + `iot_usbh_rndis` — al conectar la GoPro por USB,
   el driver le asigna IP por DHCP. Sigue el ejemplo
   `usb_rndis_4g_module` del repo `esp-iot-solution` como base (mismo driver,
   solo cambia qué IP/HTTP hablas del otro lado).
3. Habilitar el control HTTP de la GoPro (una vez, al conectar):
   `GET http://<ip-gopro>:8080/gopro/camera/control/wired_usb?p=1`
4. Cada ~2s, preguntar a Supabase si hay una captura pendiente:
   `GET {SUPABASE_URL}/rest/v1/reconocimientos_faciales?resultado=eq.captura_requerida&url_foto=is.null&order=timestamp.desc&limit=1&select=id,timestamp`
   Header: `apikey: <publishable key>`
5. Si hay una fila y es reciente (< 30s):
   - Tomar foto: `GET http://<ip-gopro>:8080/gopro/camera/shutter/start`
   - Listar media: `GET http://<ip-gopro>:8080/gopro/media/list` → tomar el
     archivo más reciente (`folder` + `file`).
   - Descargar: `GET http://<ip-gopro>:8080/videos/DCIM/<folder>/<file>`
   - Codificar en base64 y `POST` a
     `{SUPABASE_URL}/functions/v1/procesar_reconocimiento_facial` con
     `{ reconocimiento_id, foto_base64 }`, header `apikey: <publishable key>`.

```c
#include "esp_http_client.h"
#include "esp_wifi.h"
#include "iot_usbh_rndis.h"
#include "cJSON.h"
#include "mbedtls/base64.h"

#define SUPABASE_URL   "https://jnypbzgcvnhkddhxhmkw.supabase.co"
#define SUPABASE_APIKEY "sb_publishable_8VatRQ4xyU0Zcg1csoj6xw_c3WN2R7q"

static char gopro_base_url[64] = {0}; // se llena cuando iot_usbh_rndis reporta la IP asignada

// --- Helper genérico para requests HTTP con buffer de respuesta ---
static esp_err_t http_get(const char *url, const char *apikey, char *out_buf, size_t out_len) {
    esp_http_client_config_t config = { .url = url, .timeout_ms = 8000 };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (apikey) esp_http_client_set_header(client, "apikey", apikey);

    esp_err_t err = esp_http_client_open(client, 0);
    if (err != ESP_OK) { esp_http_client_cleanup(client); return err; }

    esp_http_client_fetch_headers(client);
    int len = esp_http_client_read_response(client, out_buf, out_len - 1);
    if (len >= 0) out_buf[len] = '\0';

    esp_http_client_cleanup(client);
    return ESP_OK;
}

// 1 sola vez, al detectar que la GoPro quedó conectada por RNDIS (callback de iot_usbh_rndis)
void gopro_habilitar_control_usb(void) {
    char resp[256];
    char url[96];
    snprintf(url, sizeof(url), "%s/gopro/camera/control/wired_usb?p=1", gopro_base_url);
    http_get(url, NULL, resp, sizeof(resp));
}

// Pregunta a Supabase si hay una captura pendiente. Devuelve el id (o cadena vacía si no hay).
static void consultar_pendiente(char *reconocimiento_id_out, size_t out_len) {
    reconocimiento_id_out[0] = '\0';
    char url[256];
    snprintf(url, sizeof(url),
        "%s/rest/v1/reconocimientos_faciales"
        "?resultado=eq.captura_requerida&url_foto=is.null"
        "&order=timestamp.desc&limit=1&select=id,timestamp",
        SUPABASE_URL);

    char resp[512];
    if (http_get(url, SUPABASE_APIKEY, resp, sizeof(resp)) != ESP_OK) return;

    cJSON *json = cJSON_Parse(resp);
    if (!json) return;
    cJSON *fila = cJSON_GetArrayItem(json, 0);
    if (fila) {
        cJSON *id = cJSON_GetObjectItem(fila, "id");
        // TODO: valida también que "timestamp" sea de los últimos 30s antes de continuar.
        if (cJSON_IsString(id)) {
            strncpy(reconocimiento_id_out, id->valuestring, out_len - 1);
        }
    }
    cJSON_Delete(json);
}

// Dispara la captura en la GoPro y descarga la foto más reciente.
// jpg_buf debe ser suficientemente grande (una foto GoPro puede pesar varios MB:
// considera bajar la resolución/calidad en los ajustes de la cámara para que quepa en RAM,
// o guardarla en una SD/PSRAM en vez de un buffer estático).
static size_t capturar_foto_gopro(uint8_t *jpg_buf, size_t buf_len) {
    char resp[256], url[128];

    // 1. Disparar el obturador
    snprintf(url, sizeof(url), "%s/gopro/camera/shutter/start", gopro_base_url);
    http_get(url, NULL, resp, sizeof(resp));
    vTaskDelay(pdMS_TO_TICKS(1500)); // dar tiempo a que la GoPro procese y guarde el archivo

    // 2. Listar media y tomar el archivo más reciente
    // TODO: confirmar el path exacto contra la doc oficial de tu firmware de GoPro
    // (https://gopro.github.io/OpenGoPro/http/) — el usado aquí es /gopro/media/list.
    snprintf(url, sizeof(url), "%s/gopro/media/list", gopro_base_url);
    char lista[1024];
    http_get(url, NULL, lista, sizeof(lista));

    char folder[32] = {0}, file[32] = {0};
    cJSON *json = cJSON_Parse(lista);
    // TODO: recorrer json->media[0]->fs y tomar el último elemento; la forma exacta
    // del JSON depende de la versión de firmware — imprime `lista` la primera vez
    // para confirmar la estructura antes de parsear en definitiva.
    cJSON_Delete(json);

    // 3. Descargar el archivo
    snprintf(url, sizeof(url), "%s/videos/DCIM/%s/%s", gopro_base_url, folder, file);
    esp_http_client_config_t config = { .url = url, .timeout_ms = 15000 };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_open(client, 0);
    esp_http_client_fetch_headers(client);
    int total = esp_http_client_read_response(client, (char *)jpg_buf, buf_len);
    esp_http_client_cleanup(client);

    return total > 0 ? (size_t)total : 0;
}

// Envía la foto capturada a la Edge Function, junto con el id de la fila a resolver.
static void enviar_a_edge_function(const char *reconocimiento_id, uint8_t *jpg_buf, size_t jpg_len) {
    size_t b64_len = 0;
    mbedtls_base64_encode(NULL, 0, &b64_len, jpg_buf, jpg_len); // calcula tamaño necesario
    char *b64 = malloc(b64_len);
    mbedtls_base64_encode((unsigned char *)b64, b64_len, &b64_len, jpg_buf, jpg_len);

    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "reconocimiento_id", reconocimiento_id);
    cJSON_AddStringToObject(body, "foto_base64", b64);
    char *payload = cJSON_PrintUnformatted(body);

    char url[128];
    snprintf(url, sizeof(url), "%s/functions/v1/procesar_reconocimiento_facial", SUPABASE_URL);

    esp_http_client_config_t config = { .url = url, .method = HTTP_METHOD_POST, .timeout_ms = 20000 };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "apikey", SUPABASE_APIKEY);
    esp_http_client_set_post_field(client, payload, strlen(payload));
    esp_http_client_perform(client);
    esp_http_client_cleanup(client);

    free(b64);
    free(payload);
    cJSON_Delete(body);
}

// Loop principal (crear como tarea FreeRTOS, correr cada ~2s)
void tarea_monitoreo_alarma(void *arg) {
    char reconocimiento_id[64];
    static uint8_t jpg_buf[512 * 1024]; // ajustar según calidad/resolución configurada en la GoPro

    while (1) {
        if (gopro_base_url[0] != '\0') { // solo si la GoPro ya está conectada
            consultar_pendiente(reconocimiento_id, sizeof(reconocimiento_id));
            if (reconocimiento_id[0] != '\0') {
                size_t len = capturar_foto_gopro(jpg_buf, sizeof(jpg_buf));
                if (len > 0) {
                    enviar_a_edge_function(reconocimiento_id, jpg_buf, len);
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}
```

**Dos cosas marcadas `TODO` que dependen de tu hardware exacto y que solo se
resuelven probando con la GoPro real:**
1. La estructura exacta del JSON que devuelve `/gopro/media/list` (varía un
   poco por modelo/firmware) — imprime la respuesta cruda la primera vez y
   ajusta el parseo.
2. La forma en que `iot_usbh_rndis` te entrega la IP asignada a la GoPro
   (revisa el ejemplo `usb_rndis_4g_module` del repo `esp-iot-solution` — el
   callback de conexión es el mismo, solo cambia que del otro lado hay una
   GoPro en vez de un módem 4G).

## Contrato de valores para `resultado`

`captura_requerida` (ya existe) → `identificado` | `no_identificado` |
`error_procesamiento`.
