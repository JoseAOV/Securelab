import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface Stats24h {
  eventosTotales: number;
  eventosTotalesAnterior: number;
  accesosDenegados: number;
  accesosDenegadosAnterior: number;
  equiposAuditados: number;
  porcentajeOperativos: number | null;
}

export type TipoEventoFiltro = 'todos' | 'autorizado' | 'denegado';

export interface FiltrosReporte {
  desde: string;
  hasta: string;
  tipo: TipoEventoFiltro;
  busqueda: string;
}

const TOPE_EXPORTACION = 5000;

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  /**
   * Fotografía fija de las últimas 24h (independiente del filtro de fecha
   * de la tabla), comparada contra las 24h anteriores para la tendencia.
   */
  async getStats24h(): Promise<Stats24h> {
    const ahora = new Date();
    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000);

    const [eventosTotales, eventosTotalesAnterior, accesosDenegados, accesosDenegadosAnterior, equipos] =
      await Promise.all([
        this.contarEventos(hace24h, ahora),
        this.contarEventos(hace48h, hace24h),
        this.contarEventos(hace24h, ahora, true),
        this.contarEventos(hace48h, hace24h, true),
        this.equiposAuditados(hace24h, ahora),
      ]);

    return {
      eventosTotales,
      eventosTotalesAnterior,
      accesosDenegados,
      accesosDenegadosAnterior,
      equiposAuditados: equipos.total,
      porcentajeOperativos: equipos.total > 0 ? Math.round((equipos.operativos / equipos.total) * 100) : null,
    };
  }

  private async contarEventos(desde: Date, hasta: Date, soloAlertas = false): Promise<number> {
    let query = this.supabase
      .from('eventos_movimiento')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', desde.toISOString())
      .lt('timestamp', hasta.toISOString());

    if (soloAlertas) {
      query = query.eq('alerta_disparada', true);
    }

    const { count, error } = await query;
    if (error) {
      console.error('Error al contar eventos:', error);
      return 0;
    }
    return count ?? 0;
  }

  private async equiposAuditados(desde: Date, hasta: Date): Promise<{ total: number; operativos: number }> {
    const { data, error } = await this.supabase
      .from('eventos_movimiento')
      .select('activo_id')
      .gte('timestamp', desde.toISOString())
      .lt('timestamp', hasta.toISOString());

    if (error || !data || data.length === 0) {
      return { total: 0, operativos: 0 };
    }

    const idsUnicos = [...new Set(data.map((d) => d.activo_id))];

    const { data: activos } = await this.supabase
      .from('activos')
      .select('id, estado')
      .in('id', idsUnicos);

    const operativos = (activos ?? []).filter((a) => a.estado !== 'en_mantenimiento').length;
    return { total: idsUnicos.length, operativos };
  }

  /**
   * Tabla de auditoría paginada, con los mismos filtros que la exportación.
   */
  async getEventosFiltrados(
    filtros: FiltrosReporte,
    pagina: number,
    porPagina: number
  ): Promise<{ data: any[]; total: number }> {
    try {
      const desdeIdx = (pagina - 1) * porPagina;
      const hastaIdx = desdeIdx + porPagina - 1;

      const { data, error, count } = await this.construirQuery(filtros, { count: 'exact' }).range(
        desdeIdx,
        hastaIdx
      );

      if (error) {
        console.error('Error al obtener eventos filtrados:', error);
        return { data: [], total: 0 };
      }
      return { data: data ?? [], total: count ?? 0 };
    } catch (err) {
      console.error('Excepción inesperada en getEventosFiltrados:', err);
      return { data: [], total: 0 };
    }
  }

  /**
   * Mismo filtro, sin paginar (con un tope), para CSV/PDF.
   */
  async getEventosParaExportar(filtros: FiltrosReporte): Promise<any[]> {
    try {
      const { data, error } = await this.construirQuery(filtros).limit(TOPE_EXPORTACION);
      if (error) {
        console.error('Error al obtener eventos para exportar:', error);
        return [];
      }
      return data ?? [];
    } catch (err) {
      console.error('Excepción inesperada en getEventosParaExportar:', err);
      return [];
    }
  }

  /**
   * select() siempre va primero — los filtros (.eq/.gte/.or/.order) solo
   * existen en el builder que devuelve select(), no en from() directo.
   */
  private construirQuery(filtros: FiltrosReporte, selectOptions: { count?: 'exact' } = {}) {
    let query = this.supabase
      .from('vista_actividad_reciente')
      .select('*', selectOptions)
      .gte('timestamp', filtros.desde)
      .lte('timestamp', filtros.hasta)
      .order('timestamp', { ascending: false });

    if (filtros.tipo === 'autorizado') {
      query = query.eq('alerta_disparada', false);
    } else if (filtros.tipo === 'denegado') {
      query = query.eq('alerta_disparada', true);
    }

    const term = filtros.busqueda.trim().replace(/[,()]/g, '');
    if (term) {
      query = query.or(`rfid_tag.ilike.%${term}%,persona_nombre.ilike.%${term}%,equipo.ilike.%${term}%`);
    }

    return query;
  }
}
