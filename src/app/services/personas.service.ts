import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface NuevaPersona {
  matricula: string;
  nombre: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class PersonasService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  /**
   * Obtiene todas las personas del padrón (usuarios_universidad),
   * ordenadas alfabéticamente por nombre. Solo accesible por laboratorista
   * (RLS: usuarios_universidad_select_own_or_admin).
   */
  async getTodasLasPersonas(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios_universidad')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al obtener las personas:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción inesperada en getTodasLasPersonas:', err);
      return [];
    }
  }

  /**
   * Registra una nueva persona en el padrón, sin cuenta vinculada todavía
   * (auth_user_id queda null hasta que se autoregistre con esa matrícula).
   */
  async registrarPersona(persona: NuevaPersona): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios_universidad')
        .insert(persona)
        .select()
        .single();

      if (error) {
        console.error('Error al registrar persona:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Excepción inesperada en registrarPersona:', err);
      return null;
    }
  }

  /**
   * Edita nombre y/o rol de una persona ya existente. La matrícula no se
   * toca aquí (es la llave que ya vincula, en su caso, la cuenta de Auth).
   */
  async actualizarPersona(matricula: string, cambios: { nombre?: string; rol?: string }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('usuarios_universidad')
        .update(cambios)
        .eq('matricula', matricula);

      if (error) {
        console.error('Error al actualizar persona:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Excepción inesperada en actualizarPersona:', err);
      return false;
    }
  }

  /**
   * Banea o desbanea una cuenta. Reversible — no toca Supabase Auth, solo
   * bloquea el acceso vía el chequeo en AuthService.signIn()/authGuard.
   */
  async cambiarBaneo(matricula: string, baneado: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('usuarios_universidad')
        .update({ baneado })
        .eq('matricula', matricula);

      if (error) {
        console.error('Error al cambiar el estado de baneo:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Excepción inesperada en cambiarBaneo:', err);
      return false;
    }
  }

  /**
   * Elimina a la persona por completo, incluyendo su cuenta real de
   * Supabase Auth si la tiene — por eso pasa por la Edge Function
   * eliminar_persona (necesita la Admin API, no se puede hacer desde el
   * cliente). Irreversible.
   */
  async eliminarPersona(matricula: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.functions.invoke('eliminar_persona', {
        body: { matricula },
      });

      if (error) {
        let mensaje = error.message;
        // FunctionsHttpError trae la respuesta real de la función en .context
        // (un Response) — ahí viene el mensaje específico, no en error.message.
        const contexto = (error as any).context;
        if (contexto instanceof Response) {
          try {
            const body = await contexto.json();
            mensaje = body?.error ?? mensaje;
          } catch {
            // sin body JSON, nos quedamos con error.message
          }
        }
        console.error('Error al eliminar persona:', mensaje);
        return { error: mensaje };
      }
      return { error: null };
    } catch (err: any) {
      console.error('Excepción inesperada en eliminarPersona:', err);
      return { error: err.message ?? 'Error inesperado.' };
    }
  }
}
