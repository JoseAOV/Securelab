import { Component, OnInit } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ViewWillEnter } from '@ionic/angular/standalone';
import {
  checkmarkCircleOutline,
  checkmarkCircleSharp,
  swapHorizontalOutline,
  swapHorizontalSharp,
  warningOutline,
  warningSharp,
  alertCircleOutline,
  alertCircleSharp,
  videocamOutline,
  videocamSharp,
  laptopOutline,
  laptopSharp,
  personOutline,
  personSharp,
  timeOutline,
  timeSharp,
  locationOutline,
  locationSharp,
  returnDownBackOutline,
  returnDownBackSharp,
  shieldCheckmarkOutline,
  shieldCheckmarkSharp,
  ellipseOutline,
  pulseOutline,
  pulseSharp,
  eyeOutline,
  eyeSharp,
  notificationsOutline,
  notificationsSharp,
  menuOutline,
  menuSharp,
  desktopOutline,
  desktopSharp,
  imageOutline,
  imageSharp,
  checkmarkDoneOutline,
  checkmarkDoneSharp,
  closeCircleOutline,
  closeCircleSharp,
} from 'ionicons/icons';

// ── Interfaces ──
interface AlertaCamara {
  sujeto: string;
  confianza: number;
}

interface Alerta {
  id: number;
  tipo: string;
  equipo: string;
  hora: string;
  sensor: string;
  camara: AlertaCamara;
  severidad: 'critica' | 'alta' | 'media';
}

import { ActivosService } from '../../services/activos.service';

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
  ],
})
export class DashboardPage implements OnInit, ViewWillEnter {
  // ── Estadísticas (datos reales) ──
  totalDisponibles = 0;
  totalPrestados = 0;
  notificaciones = 0;

  // ── Alertas de Seguridad (Mock Data — se conectará a Supabase en un ticket futuro) ──
  alertas: Alerta[] = [
    {
      id: 1,
      tipo: 'Salida no autorizada detectada',
      equipo: 'Laptop HP ProBook',
      hora: '10:45 hs',
      sensor: 'Puerta Principal Lab',
      camara: {
        sujeto: 'María Fernanda',
        confianza: 92,
      },
      severidad: 'critica',
    },
  ];

  // ── Préstamos Activos (datos reales desde vista SQL) ──
  prestamosActivos: any[] = [];

  // ── Historial de Devoluciones ──
  prestamosFinalizados: any[] = [];

  // ── Modal de Evidencia ──
  isEvidenciaModalOpen = false;
  fotoSeleccionada: string | null = null;

  constructor(private activosService: ActivosService) {
    addIcons({
      checkmarkCircleOutline,
      checkmarkCircleSharp,
      swapHorizontalOutline,
      swapHorizontalSharp,
      warningOutline,
      warningSharp,
      alertCircleOutline,
      alertCircleSharp,
      videocamOutline,
      videocamSharp,
      laptopOutline,
      laptopSharp,
      personOutline,
      personSharp,
      timeOutline,
      timeSharp,
      locationOutline,
      locationSharp,
      returnDownBackOutline,
      returnDownBackSharp,
      shieldCheckmarkOutline,
      shieldCheckmarkSharp,
      ellipseOutline,
      pulseOutline,
      pulseSharp,
      eyeOutline,
      eyeSharp,
      notificationsOutline,
      notificationsSharp,
      menuOutline,
      menuSharp,
      desktopOutline,
      desktopSharp,
      imageOutline,
      imageSharp,
      checkmarkDoneOutline,
      checkmarkDoneSharp,
      closeCircleOutline,
      closeCircleSharp,
    });
  }

  ngOnInit(): void { }

  /**
   * Se ejecuta cada vez que la vista entra al viewport.
   * Garantiza datos frescos al volver desde otra página.
   */
  async ionViewWillEnter(): Promise<void> {
    await this.cargarDatos();
  }

  /**
   * Carga estadísticas reales y préstamos activos desde Supabase.
   */
  async cargarDatos(): Promise<void> {
    // 1. Obtener todos los activos para calcular estadísticas
    const todosLosActivos = await this.activosService.getTodosLosActivos();

    this.totalDisponibles = todosLosActivos.filter(
      (a) => a.estado === 'en_laboratorio'
    ).length;

    this.totalPrestados = todosLosActivos.filter(
      (a) => a.estado === 'en_prestamo'
    ).length;

    // 2. Obtener préstamos activos desde la vista SQL
    this.prestamosActivos = await this.activosService.getActivosPrestados();

    // 3. Obtener historial de devoluciones
    this.prestamosFinalizados = await this.activosService.getPrestamosFinalizados();


    // Notificaciones = alertas + préstamos activos
    this.notificaciones = this.alertas.length + this.prestamosActivos.length;
  }

  /**
   * Manejador de pull-to-refresh.
   */
  async handleRefresh(event: any): Promise<void> {
    await this.cargarDatos();
    event.target.complete();
  }

  /**
   * Acción placeholder para revocar un préstamo.
   * Se conectará a Supabase en un ticket futuro.
   */
  revocarPrestamo(prestamo: any): void {
    console.log('Revocando préstamo:', prestamo);
  }

  /**
   * Abre el modal de evidencia con la foto seleccionada.
   */
  abrirEvidencia(url: string): void {
    this.fotoSeleccionada = url;
    this.isEvidenciaModalOpen = true;
  }

  /**
   * Cierra el modal de evidencia y limpia la variable.
   */
  cerrarEvidencia(): void {
    this.isEvidenciaModalOpen = false;
    this.fotoSeleccionada = null;
  }
}
