import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class ActivosService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  // ──────────────────────────────────────────────
  //  LECTURA (Read & Vistas)
  // ──────────────────────────────────────────────

  /**
   * Obtiene todos los activos de la tabla `activos`,
   * ordenados alfabéticamente por nombre.
   */
  async getTodosLosActivos(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('activos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al obtener todos los activos:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción inesperada en getTodosLosActivos:', err);
      return [];
    }
  }

  /**
   * Obtiene los activos actualmente prestados desde la vista
   * `vista_activos_prestados` creada en el backend.
   * Alimenta el Dashboard.
   */
  async getActivosPrestados(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('vista_activos_prestados')
        .select('*');

      if (error) {
        console.error('Error al obtener activos prestados:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción inesperada en getActivosPrestados:', err);
      return [];
    }
  }

  // ──────────────────────────────────────────────
  //  ESCRITURA Y ACTUALIZACIÓN (Create, Update, Delete)
  // ──────────────────────────────────────────────

  /**
   * Habilita o deshabilita el permiso de préstamo de un activo.
   * @param id  - UUID del activo.
   * @param habilitado - `true` para permitir préstamos, `false` para bloquearlos.
   */
  async togglePermisoPrestamo(id: string, habilitado: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('activos')
        .update({ prestamo_habilitado: habilitado })
        .eq('id', id);

      if (error) {
        console.error(`Error al actualizar permiso de préstamo (id: ${id}):`, error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Excepción inesperada en togglePermisoPrestamo:', err);
      return false;
    }
  }

  /**
   * Crea un nuevo activo en la tabla `activos`.
   * Campos esperados: nombre, descripcion, rfid_tag, estado, ubicacion.
   * @param nuevoActivo - Objeto con los datos del activo a insertar.
   */
  async crearActivo(nuevoActivo: any): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('activos')
        .insert(nuevoActivo)
        .select()
        .single();

      if (error) {
        console.error('Error al crear activo:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Excepción inesperada en crearActivo:', err);
      return null;
    }
  }

  /**
   * Elimina un activo de la tabla `activos` por su ID.
   * @param id - UUID del activo a eliminar.
   */
  async eliminarActivo(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('activos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error al eliminar activo (id: ${id}):`, error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Excepción inesperada en eliminarActivo:', err);
      return false;
    }
  }

  // ──────────────────────────────────────────────
  //  DASHBOARD: Historial de Devoluciones
  // ──────────────────────────────────────────────

  /**
   * Obtiene los préstamos finalizados (estado === 'devuelto')
   * con join a la tabla `activos` para mostrar el nombre del equipo.
   * Ordenados por fecha de expiración descendente (más recientes primero).
   */
  async getPrestamosFinalizados(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('codigos_prestamo')
        .select('*, activos(*)')
        .eq('estado', 'devuelto')
        .order('expira_en', { ascending: false });

      if (error) {
        console.error('Error al obtener préstamos finalizados:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción en getPrestamosFinalizados:', err);
      return [];
    }
  }

  // ──────────────────────────────────────────────
  //  PORTAL: Generación de Pase de Salida
  // ──────────────────────────────────────────────

  /**
   * Genera un código de préstamo (pase de salida) con vigencia de 10 minutos.
   * Inserta un registro en la tabla `codigos_prestamo`.
   * @param activoId - UUID del activo para el cual se genera el pase.
   */
  async generarPaseDeSalida(activoId: string): Promise<boolean> {
    try {
      // Calculamos la expiración: 10 minutos a partir de ahora
      const expira = new Date(Date.now() + 10 * 60000).toISOString();

      const { error } = await this.supabase
        .from('codigos_prestamo')
        .insert({
          matricula: '202103001',
          activo_id: activoId,
          codigo_autorizacion: 'PASS-' + Math.floor(Math.random() * 9000 + 1000),
          estado: 'solicitado',
          expira_en: expira
        });

      if (error) {
        console.error('Error al generar pase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Excepción al generar pase:', err);
      return false;
    }
  }

  // ──────────────────────────────────────────────
  //  PORTAL: Consulta de Préstamos Activos del Usuario
  // ──────────────────────────────────────────────

  /**
   * Obtiene los préstamos activos de un usuario por su matrícula.
   * Hace un join con la tabla `activos` para traer nombre del equipo.
   * @param matricula - Matrícula del estudiante.
   */
  async getPrestamosActivosUsuario(matricula: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('codigos_prestamo')
        .select('*, activos(*)')
        .eq('matricula', matricula)
        .eq('estado', 'activo');

      if (error) {
        console.error('Error al obtener préstamos activos del usuario:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción en getPrestamosActivosUsuario:', err);
      return [];
    }
  }

  // ──────────────────────────────────────────────
  //  PORTAL: Subir Evidencia de Devolución
  // ──────────────────────────────────────────────

  /**
   * Abre la cámara, sube la foto al bucket `evidencia_devoluciones`
   * y guarda la URL pública en `codigos_prestamo.url_evidencia_devolucion`.
   * NO cambia el estado a 'devuelto' (el hardware lo hará).
   * @param prestamoId - UUID del registro en codigos_prestamo.
   */
  async subirEvidenciaDevolucion(prestamoId: string): Promise<boolean> {
    try {
      // 1. Capturar foto con la cámara
      const foto = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
      });

      if (!foto.dataUrl) {
        console.error('No se obtuvo imagen de la cámara.');
        return false;
      }

      // 2. Convertir Data URL a Blob para subir a Storage
      const respuesta = await fetch(foto.dataUrl);
      const blob = await respuesta.blob();

      // 3. Generar nombre único para el archivo
      const timestamp = Date.now();
      const nombreArchivo = `devolucion_${prestamoId}_${timestamp}.jpg`;

      // 4. Subir al bucket público "evidencia_devoluciones"
      const { error: errorUpload } = await this.supabase.storage
        .from('evidencia_devoluciones')
        .upload(nombreArchivo, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (errorUpload) {
        console.error('Error al subir evidencia:', errorUpload);
        return false;
      }

      // 5. Obtener la URL pública del archivo subido
      const { data: urlData } = this.supabase.storage
        .from('evidencia_devoluciones')
        .getPublicUrl(nombreArchivo);

      const urlPublica = urlData.publicUrl;

      // 6. Actualizar el registro con la URL de evidencia
      const { error: errorUpdate } = await this.supabase
        .from('codigos_prestamo')
        .update({ url_evidencia_devolucion: urlPublica })
        .eq('id', prestamoId);

      if (errorUpdate) {
        console.error('Error al guardar URL de evidencia:', errorUpdate);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Excepción en subirEvidenciaDevolucion:', err);
      return false;
    }
  }
}
