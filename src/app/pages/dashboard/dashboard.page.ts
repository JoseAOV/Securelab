import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  checkmarkCircleOutline,
  checkmarkCircleSharp,
  swapHorizontalOutline,
  swapHorizontalSharp,
  warningOutline,
  warningSharp,
  alertCircleOutline,
  alertCircleSharp,
  laptopOutline,
  laptopSharp,
  personOutline,
  personSharp,
  timeOutline,
  timeSharp,
  ellipseOutline,
  notificationsOutline,
  notificationsSharp,
  menuOutline,
  menuSharp,
  imageOutline,
  imageSharp,
  checkmarkDoneOutline,
  checkmarkDoneSharp,
  closeOutline,
  closeSharp,
  syncOutline,
  syncSharp,
} from 'ionicons/icons';

import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    CommonModule,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonButton,
  ],
})
export class DashboardPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  // ── Feed de actividad (datos reales) ──
  feed: any[] = [];
  ultimoAcceso: any = null;
  actividadReciente: any[] = [];

  // ── Estado de conexión en vivo ──
  conectado = false;
  private canal: RealtimeChannel | null = null;

  // ── Modal de Evidencia ──
  isEvidenciaModalOpen = false;
  fotoSeleccionada: string | null = null;

  // ── Modal de Historial Completo ──
  isHistorialModalOpen = false;
  historialCompleto: any[] = [];

  constructor(private eventosService: EventosService) {
    addIcons({
      checkmarkCircleOutline,
      checkmarkCircleSharp,
      swapHorizontalOutline,
      swapHorizontalSharp,
      warningOutline,
      warningSharp,
      alertCircleOutline,
      alertCircleSharp,
      laptopOutline,
      laptopSharp,
      personOutline,
      personSharp,
      timeOutline,
      timeSharp,
      ellipseOutline,
      notificationsOutline,
      notificationsSharp,
      menuOutline,
      menuSharp,
      imageOutline,
      imageSharp,
      checkmarkDoneOutline,
      checkmarkDoneSharp,
      closeOutline,
      closeSharp,
      syncOutline,
      syncSharp,
    });
  }

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    await this.cargarDatos();
    this.canal = this.eventosService.suscribirseACambios(() => this.cargarDatos());
    this.conectado = true;
  }

  async ionViewWillLeave(): Promise<void> {
    if (this.canal) {
      await this.eventosService.desuscribirse(this.canal);
      this.canal = null;
    }
    this.conectado = false;
  }

  ngOnDestroy(): void {
    if (this.canal) {
      this.eventosService.desuscribirse(this.canal);
      this.canal = null;
    }
  }

  async cargarDatos(): Promise<void> {
    this.feed = await this.eventosService.getActividadReciente(30);
    this.ultimoAcceso = this.feed[0] ?? null;
    this.actividadReciente = this.feed.slice(1);
  }

  async handleRefresh(event: any): Promise<void> {
    await this.cargarDatos();
    event.target.complete();
  }

  /**
   * Texto relativo tipo "Just now" / "hace 5 min" / hora exacta si ya pasó
   * más de una hora.
   */
  tiempoRelativo(timestamp: string): string {
    const segundos = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (segundos < 60) return 'Just now';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Deriva el texto del evento a partir de alerta_disparada + direccion.
   * Se usa tanto en la tarjeta destacada como en la lista.
   */
  descripcionEvento(item: any): string {
    if (item.alerta_disparada) return 'Salida no autorizada';
    return item.direccion === 'entrada' ? 'Devolución exitosa' : 'Salida Autorizada';
  }

  claseEvento(item: any): string {
    return item.alerta_disparada ? 'evento--alerta' : 'evento--ok';
  }

  iconoEvento(item: any): string {
    if (item.alerta_disparada) return 'warning';
    return item.direccion === 'entrada' ? 'checkmark-done-outline' : 'swap-horizontal';
  }

  /**
   * Abre el modal de evidencia si el ítem de devolución tiene foto.
   */
  abrirEvidenciaSiAplica(item: any): void {
    if (!item.alerta_disparada && item.direccion === 'entrada' && item.url_evidencia_devolucion) {
      this.abrirEvidencia(item.url_evidencia_devolucion);
    }
  }

  abrirEvidencia(url: string): void {
    this.fotoSeleccionada = url;
    this.isEvidenciaModalOpen = true;
  }

  cerrarEvidencia(): void {
    this.isEvidenciaModalOpen = false;
    this.fotoSeleccionada = null;
  }

  async abrirHistorialCompleto(): Promise<void> {
    this.historialCompleto = await this.eventosService.getActividadReciente(100);
    this.isHistorialModalOpen = true;
  }

  cerrarHistorial(): void {
    this.isHistorialModalOpen = false;
  }
}
