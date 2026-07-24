import { Injectable } from '@angular/core';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class EventosService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  /**
   * Feed de actividad reciente (entradas, salidas y alertas) desde
   * vista_actividad_reciente, más reciente primero.
   */
  async getActividadReciente(limite = 30): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('vista_actividad_reciente')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limite);

      if (error) {
        console.error('Error al obtener la actividad reciente:', error);
        return [];
      }

      return data ?? [];
    } catch (err) {
      console.error('Excepción inesperada en getActividadReciente:', err);
      return [];
    }
  }

  /**
   * Escucha nuevos cruces (INSERT) en eventos_movimiento en tiempo real.
   * Devuelve el canal para poder des-suscribirse al salir de la pantalla.
   */
  suscribirseACambios(onNuevoEvento: () => void): RealtimeChannel {
    return this.supabase
      .channel('eventos_movimiento_dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'eventos_movimiento' },
        () => onNuevoEvento()
      )
      .subscribe();
  }

  async desuscribirse(channel: RealtimeChannel): Promise<void> {
    await this.supabase.removeChannel(channel);
  }
}
