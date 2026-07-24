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
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonNote,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonTextarea,
  IonButton,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  shieldCheckmarkSharp,
  checkmarkCircleOutline,
  checkmarkCircleSharp,
  swapHorizontalOutline,
  swapHorizontalSharp,
  alertCircleOutline,
  alertCircleSharp,
  hardwareChipOutline,
  hardwareChipSharp,
  locationOutline,
  locationSharp,
  searchOutline,
  searchSharp,
  buildOutline,
  buildSharp,
  ellipseOutline,
  ellipseSharp,
  addOutline,
  addSharp,
  closeOutline,
  closeSharp,
  saveOutline,
  saveSharp,
  qrCodeOutline,
  qrCodeSharp,
  archiveOutline,
  archiveSharp,
  lockClosedOutline,
  laptopOutline,
  videocamOutline,
  printOutline,
  pulseOutline,
  tvOutline,
  desktopOutline,
  chevronDownOutline,
} from 'ionicons/icons';
import { ActivosService } from '../../services/activos.service';
import * as QRCode from 'qrcode';

type FiltroEstado = 'todos' | 'en_laboratorio' | 'en_prestamo';

interface IconoActivo {
  icono: string;
  clase: string;
}

const ICONOS_POR_PALABRA: { claves: string[]; icono: string; clase: string }[] = [
  { claves: ['laptop', 'macbook', 'notebook'], icono: 'laptop-outline', clase: 'icono--azul' },
  { claves: ['camara', 'cámara', 'camera'], icono: 'videocam-outline', clase: 'icono--oscuro' },
  { claves: ['impresora', 'printer'], icono: 'print-outline', clase: 'icono--naranja' },
  { claves: ['arduino', 'kit'], icono: 'hardware-chip-outline', clase: 'icono--azul' },
  { claves: ['osciloscopio', 'scope'], icono: 'pulse-outline', clase: 'icono--morado' },
  { claves: ['proyector', 'projector'], icono: 'tv-outline', clase: 'icono--naranja' },
];

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonToggle,
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonFab,
    IonFabButton,
    IonModal,
    IonInput,
    IonTextarea,
    IonButton,
  ],
})
export class InventarioPage implements OnInit, ViewWillEnter {
  activos: any[] = [];
  activosFiltrados: any[] = [];
  cargando = true;
  searchTerm = '';
  filtroActivo: FiltroEstado = 'todos';
  cantidadVisible = 10;

  // Modal de alta de activos
  isModalOpen: boolean = false;

  // Modal de QR de un activo
  isQrModalOpen: boolean = false;
  activoParaQr: any = null;
  qrDataUrl: string | null = null;
  nuevoActivo: any = {
    nombre: '',
    descripcion: '',
    rfid_tag: '',
    ubicacion: 'Laboratorio TI - Principal',
    estado: 'en_laboratorio',
    prestamo_habilitado: true,
  };

  constructor(
    private activosService: ActivosService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      shieldCheckmarkOutline,
      shieldCheckmarkSharp,
      checkmarkCircleOutline,
      checkmarkCircleSharp,
      swapHorizontalOutline,
      swapHorizontalSharp,
      alertCircleOutline,
      alertCircleSharp,
      hardwareChipOutline,
      hardwareChipSharp,
      locationOutline,
      locationSharp,
      searchOutline,
      searchSharp,
      buildOutline,
      buildSharp,
      ellipseOutline,
      ellipseSharp,
      addOutline,
      addSharp,
      closeOutline,
      closeSharp,
      saveOutline,
      saveSharp,
      qrCodeOutline,
      qrCodeSharp,
      archiveOutline,
      archiveSharp,
      lockClosedOutline,
      laptopOutline,
      videocamOutline,
      printOutline,
      pulseOutline,
      tvOutline,
      desktopOutline,
      chevronDownOutline,
    });
  }

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    await this.cargarActivos();
  }

  async cargarActivos(): Promise<void> {
    this.cargando = true;
    this.activos = await this.activosService.getTodosLosActivos();
    this.filtrarActivos();
    this.cargando = false;
  }

  async handleRefresh(event: any): Promise<void> {
    await this.cargarActivos();
    event.target.complete();
  }

  // ── Stats (alimentan las tarjetas-filtro de arriba) ──
  get totalEquipos(): number {
    return this.activos.length;
  }

  get totalDisponibles(): number {
    return this.activos.filter((a) => a.estado === 'en_laboratorio').length;
  }

  get totalEnPrestamo(): number {
    return this.activos.filter((a) => a.estado === 'en_prestamo').length;
  }

  /**
   * Las tarjetas de stats funcionan como botones de filtro. No hay
   * tarjeta/filtro de "Mantenimiento" a propósito — no se va a usar esa
   * función por ahora.
   */
  setFiltro(filtro: FiltroEstado): void {
    this.filtroActivo = this.filtroActivo === filtro ? 'todos' : filtro;
    this.filtrarActivos();
  }

  filtrarActivos(): void {
    const term = this.searchTerm.toLowerCase().trim();

    let base = this.activos;
    if (this.filtroActivo === 'en_laboratorio' || this.filtroActivo === 'en_prestamo') {
      base = base.filter((a) => a.estado === this.filtroActivo);
    }
    if (term) {
      base = base.filter(
        (a) =>
          a.nombre?.toLowerCase().includes(term) ||
          a.ubicacion?.toLowerCase().includes(term) ||
          a.rfid_tag?.toLowerCase().includes(term)
      );
    }

    this.activosFiltrados = [...base];
    this.cantidadVisible = 10;
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value || '';
    this.filtrarActivos();
  }

  cargarMasResultados(): void {
    this.cantidadVisible += 10;
  }

  async cambiarPermiso(activo: any, event: any): Promise<void> {
    const nuevoEstado: boolean = event.detail.checked;
    const exito = await this.activosService.togglePermisoPrestamo(
      activo.id,
      nuevoEstado
    );

    if (exito) {
      activo.prestamo_habilitado = nuevoEstado;
      const toast = await this.toastCtrl.create({
        message: nuevoEstado
          ? 'Prestamo habilitado para "' + activo.nombre + '"'
          : 'Prestamo bloqueado para "' + activo.nombre + '"',
        duration: 2000,
        position: 'bottom',
        color: nuevoEstado ? 'success' : 'warning',
        cssClass: 'toast-inventario',
      });
      await toast.present();
    } else {
      activo.prestamo_habilitado = !nuevoEstado;
      const toast = await this.toastCtrl.create({
        message: 'Error al actualizar "' + activo.nombre + '". Revisa la consola.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
        cssClass: 'toast-inventario',
      });
      await toast.present();
    }
  }

  /**
   * Genera y muestra el código QR de un activo (codifica su rfid_tag),
   * listo para que el admin lo capture/imprima y lo pegue en el equipo.
   */
  async verQr(activo: any): Promise<void> {
    this.activoParaQr = activo;
    this.qrDataUrl = await QRCode.toDataURL(activo.rfid_tag, { width: 280 });
    this.isQrModalOpen = true;
  }

  cerrarQr(): void {
    this.isQrModalOpen = false;
    this.activoParaQr = null;
    this.qrDataUrl = null;
  }

  /**
   * Ícono y color por tipo de equipo, derivado de palabras clave del
   * nombre — no existe una columna "categoria" en activos, así que esto
   * es puramente de presentación.
   */
  getIconoActivo(nombre: string): IconoActivo {
    const n = (nombre || '').toLowerCase();
    const match = ICONOS_POR_PALABRA.find((r) => r.claves.some((c) => n.includes(c)));
    return match ? { icono: match.icono, clase: match.clase } : { icono: 'desktop-outline', clase: 'icono--azul' };
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'en_laboratorio':
        return 'checkmark-circle';
      case 'en_prestamo':
        return 'swap-horizontal';
      case 'en_mantenimiento':
        return 'build';
      default:
        return 'ellipse';
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'en_laboratorio':
        return 'estado--disponible';
      case 'en_prestamo':
        return 'estado--prestamo';
      case 'en_mantenimiento':
        return 'estado--mantenimiento';
      default:
        return 'estado--default';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'en_laboratorio':
        return 'Disponible';
      case 'en_prestamo':
        return 'Prestado';
      case 'en_mantenimiento':
        return 'Mantenimiento';
      default:
        return estado;
    }
  }

  /**
   * Guarda un nuevo activo en Supabase, recarga la lista
   * y cierra el modal mostrando un Toast de confirmacion.
   */
  async guardarActivo(): Promise<void> {
    const creado = await this.activosService.crearActivo(this.nuevoActivo);

    if (creado) {
      // Recargar la lista completa
      await this.cargarActivos();

      // Limpiar formulario a valores por defecto
      this.nuevoActivo = {
        nombre: '',
        descripcion: '',
        rfid_tag: '',
        ubicacion: 'Laboratorio TI - Principal',
        estado: 'en_laboratorio',
        prestamo_habilitado: true,
      };

      // Cerrar modal
      this.isModalOpen = false;

      // Toast de exito
      const toast = await this.toastCtrl.create({
        message: 'Activo "' + creado.nombre + '" registrado exitosamente',
        duration: 2500,
        position: 'bottom',
        color: 'success',
        cssClass: 'toast-inventario',
      });
      await toast.present();
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Error al registrar el activo. Revisa la consola.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
        cssClass: 'toast-inventario',
      });
      await toast.present();
    }
  }
}
