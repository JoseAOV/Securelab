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
} from 'ionicons/icons';
import { ActivosService } from '../../services/activos.service';

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

  // Modal de alta de activos
  isModalOpen: boolean = false;
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

  filtrarActivos(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.activosFiltrados = [...this.activos];
      return;
    }
    this.activosFiltrados = this.activos.filter(
      (a) =>
        a.nombre?.toLowerCase().includes(term) ||
        a.ubicacion?.toLowerCase().includes(term) ||
        a.rfid_tag?.toLowerCase().includes(term)
    );
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value || '';
    this.filtrarActivos();
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
        return 'En prestamo';
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
