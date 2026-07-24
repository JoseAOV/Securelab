import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonSpinner,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonDatetime,
  IonRefresher,
  IonRefresherContent,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  barChartSharp,
  downloadOutline,
  documentTextOutline,
  statsChartOutline,
  shieldOutline,
  hardwareChipOutline,
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  checkmarkCircleOutline,
  calendarOutline,
  searchOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReportesService, Stats24h, FiltrosReporte, TipoEventoFiltro } from '../../services/reportes.service';

const PENDIENTE = 10;

@Component({
  selector: 'app-reporte',
  templateUrl: './reporte.page.html',
  styleUrls: ['./reporte.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton,
    IonSpinner,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonModal,
    IonDatetime,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ReportePage implements OnInit, ViewWillEnter {
  cargandoStats = true;
  cargandoTabla = true;
  stats: Stats24h | null = null;

  filtros: FiltrosReporte = {
    desde: this.inicioDeHoyMenos(1),
    hasta: new Date().toISOString(),
    tipo: 'todos',
    busqueda: '',
  };

  eventos: any[] = [];
  totalResultados = 0;
  pagina = 1;
  porPagina = PENDIENTE;

  isDateModalOpen = false;
  desdeTemp = this.filtros.desde;
  hastaTemp = this.filtros.hasta;

  constructor(private reportesService: ReportesService) {
    addIcons({
      barChartOutline,
      barChartSharp,
      downloadOutline,
      documentTextOutline,
      statsChartOutline,
      shieldOutline,
      hardwareChipOutline,
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      checkmarkCircleOutline,
      calendarOutline,
      searchOutline,
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    await Promise.all([this.cargarStats(), this.cargarEventos()]);
  }

  async handleRefresh(event: any): Promise<void> {
    await Promise.all([this.cargarStats(), this.cargarEventos()]);
    event.target.complete();
  }

  private inicioDeHoyMenos(dias: number): string {
    return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  }

  async cargarStats(): Promise<void> {
    this.cargandoStats = true;
    this.stats = await this.reportesService.getStats24h();
    this.cargandoStats = false;
  }

  async cargarEventos(): Promise<void> {
    this.cargandoTabla = true;
    const { data, total } = await this.reportesService.getEventosFiltrados(this.filtros, this.pagina, this.porPagina);
    this.eventos = data;
    this.totalResultados = total;
    this.cargandoTabla = false;
  }

  // ── Tendencia (vs. periodo anterior) ──
  tendencia(actual: number, anterior: number): { texto: string; icono: string; clase: string } {
    if (anterior === 0) {
      return actual > 0
        ? { texto: 'Sin datos previos', icono: 'remove-outline', clase: 'tendencia--neutral' }
        : { texto: 'Sin cambios', icono: 'remove-outline', clase: 'tendencia--neutral' };
    }
    const cambio = ((actual - anterior) / anterior) * 100;
    if (Math.abs(cambio) < 0.5) {
      return { texto: 'Sin cambios', icono: 'remove-outline', clase: 'tendencia--neutral' };
    }
    const positivo = cambio > 0;
    return {
      texto: `${positivo ? '+' : ''}${cambio.toFixed(1)}% vs ayer`,
      icono: positivo ? 'trending-up-outline' : 'trending-down-outline',
      clase: positivo ? 'tendencia--alza' : 'tendencia--baja',
    };
  }

  // ── Filtros ──
  onBusquedaChange(event: any): void {
    this.filtros = { ...this.filtros, busqueda: event.detail.value || '' };
    this.pagina = 1;
    this.cargarEventos();
  }

  onTipoChange(event: any): void {
    this.filtros = { ...this.filtros, tipo: event.detail.value as TipoEventoFiltro };
    this.pagina = 1;
    this.cargarEventos();
  }

  abrirRangoFecha(): void {
    this.desdeTemp = this.filtros.desde;
    this.hastaTemp = this.filtros.hasta;
    this.isDateModalOpen = true;
  }

  aplicarRangoFecha(): void {
    this.filtros = { ...this.filtros, desde: this.desdeTemp, hasta: this.hastaTemp };
    this.pagina = 1;
    this.isDateModalOpen = false;
    this.cargarEventos();
  }

  get rangoFechaTexto(): string {
    const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const desde = new Date(this.filtros.desde).toLocaleDateString('es-MX', opciones);
    const hasta = new Date(this.filtros.hasta).toLocaleDateString('es-MX', opciones);
    return `${desde} - ${hasta}`;
  }

  // ── Paginación ──
  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalResultados / this.porPagina));
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.pagina;
    const inicio = Math.max(1, Math.min(actual - 1, total - 2));
    const paginas: number[] = [];
    for (let p = inicio; p <= Math.min(total, inicio + 2); p++) {
      paginas.push(p);
    }
    return paginas;
  }

  irAPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas || p === this.pagina) return;
    this.pagina = p;
    this.cargarEventos();
  }

  // ── Presentación de filas ──
  getIniciales(nombre: string | null): string {
    if (!nombre) return '?';
    return nombre.trim().charAt(0).toUpperCase();
  }

  resultadoTexto(item: any): string {
    return item.alerta_disparada ? 'Denegado' : 'Autorizado';
  }

  // ── Export ──
  async descargarCSV(): Promise<void> {
    const filas = await this.reportesService.getEventosParaExportar(this.filtros);
    const encabezados = ['Fecha/Hora', 'RFID', 'Usuario', 'Rol', 'Equipo', 'Resultado'];
    const lineas = [encabezados.join(',')];

    for (const item of filas) {
      const campos = [
        new Date(item.timestamp).toLocaleString('es-MX'),
        item.rfid_tag ?? '',
        item.persona_nombre ?? 'Desconocido',
        item.persona_rol ?? '',
        item.equipo ?? '',
        this.resultadoTexto(item),
      ].map((campo) => `"${String(campo).replace(/"/g, '""')}"`);
      lineas.push(campos.join(','));
    }

    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-securelab-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  async exportarPDF(): Promise<void> {
    const filas = await this.reportesService.getEventosParaExportar(this.filtros);
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('SecureLab — Reportes y Auditoría', 14, 15);
    doc.setFontSize(9);
    doc.text(`Rango: ${this.rangoFechaTexto}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [['Fecha/Hora', 'RFID', 'Usuario', 'Rol', 'Equipo', 'Resultado']],
      body: filas.map((item) => [
        new Date(item.timestamp).toLocaleString('es-MX'),
        item.rfid_tag ?? '',
        item.persona_nombre ?? 'Desconocido',
        item.persona_rol ?? '',
        item.equipo ?? '',
        this.resultadoTexto(item),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [91, 141, 253] },
    });

    doc.save(`reporte-securelab-${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
