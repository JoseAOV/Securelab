import { Component } from '@angular/core';
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
  IonModal,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { Html5Qrcode } from 'html5-qrcode';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  shieldCheckmarkSharp,
  qrCodeOutline,
  qrCodeSharp,
  checkmarkCircleOutline,
  checkmarkCircleSharp,
  laptopOutline,
  laptopSharp,
  timeOutline,
  timeSharp,
  warningOutline,
  warningSharp,
  fileTrayFullOutline,
  fileTrayFullSharp,
  cameraOutline,
  cameraSharp,
  checkmarkDoneOutline,
  checkmarkDoneSharp,
  exitOutline,
  exitSharp,
  closeOutline,
  closeSharp,
} from 'ionicons/icons';

import { ActivosService } from '../../services/activos.service';
import { AuthService, PerfilUsuario } from '../../services/auth.service';

@Component({
  selector: 'app-portal',
  templateUrl: './portal.page.html',
  styleUrls: ['./portal.page.scss'],
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
    IonModal,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class PortalPage implements ViewWillEnter {
  equiposDisponibles: any[] = [];
  equipoSeleccionado: string = '';
  equipoEscaneado: any = null;
  prestamosActivos: any[] = [];
  perfil: PerfilUsuario | null = null;

  isScanModalOpen = false;
  private scanner: Html5Qrcode | null = null;

  constructor(
    private activosService: ActivosService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      shieldCheckmarkOutline,
      shieldCheckmarkSharp,
      qrCodeOutline,
      qrCodeSharp,
      checkmarkCircleOutline,
      checkmarkCircleSharp,
      laptopOutline,
      laptopSharp,
      timeOutline,
      timeSharp,
      warningOutline,
      warningSharp,
      fileTrayFullOutline,
      fileTrayFullSharp,
      cameraOutline,
      cameraSharp,
      checkmarkDoneOutline,
      checkmarkDoneSharp,
      exitOutline,
      exitSharp,
      closeOutline,
      closeSharp,
    });
  }

  /**
   * Carga los equipos disponibles cada vez que se entra a la vista.
   */
  async ionViewWillEnter(): Promise<void> {
    this.perfil = await this.authService.getPerfilActual();
    await this.cargarEquiposDisponibles();
    await this.cargarPrestamosActivos();
  }

  /**
   * Obtiene todos los activos y filtra los que están en laboratorio
   * y tienen préstamo habilitado.
   */
  async cargarEquiposDisponibles(): Promise<void> {
    const todos = await this.activosService.getTodosLosActivos();
    this.equiposDisponibles = todos.filter(
      (a) => a.estado === 'en_laboratorio' && a.prestamo_habilitado === true
    );
  }

  /**
   * Abre el modal de escaneo (el visor de cámara se inicia en onScanModalPresented,
   * cuando el <div id="qr-reader"> del modal ya existe en el DOM).
   */
  abrirEscaner(): void {
    this.isScanModalOpen = true;
  }

  async onScanModalPresented(): Promise<void> {
    this.scanner = new Html5Qrcode('qr-reader');
    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => this.procesarCodigoEscaneado(decodedText),
        () => {} // se llama en cada frame sin código detectado; no hace falta hacer nada
      );
    } catch (err) {
      console.error('No se pudo iniciar la cámara:', err);
      const toast = await this.toastCtrl.create({
        message: '❌ No se pudo acceder a la cámara. Revisa los permisos del navegador.',
        duration: 4000,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
      this.isScanModalOpen = false;
    }
  }

  async onScanModalDismissed(): Promise<void> {
    if (this.scanner) {
      try {
        await this.scanner.stop();
      } catch {
        // el scanner ya pudo haberse detenido solo; no es un error real
      }
      this.scanner = null;
    }
  }

  private async procesarCodigoEscaneado(rfidTag: string): Promise<void> {
    const equipo = this.equiposDisponibles.find((e) => e.rfid_tag === rfidTag);

    if (!equipo) {
      const toast = await this.toastCtrl.create({
        message: '❌ Este código no corresponde a un equipo disponible para préstamo.',
        duration: 2500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
      return; // sigue escaneando
    }

    this.equipoSeleccionado = equipo.id;
    this.equipoEscaneado = equipo;
    this.isScanModalOpen = false;
  }

  escanearOtroEquipo(): void {
    this.equipoSeleccionado = '';
    this.equipoEscaneado = null;
    this.abrirEscaner();
  }

  /**
   * Genera el pase de salida para el equipo seleccionado.
   */
  async solicitarPase(): Promise<void> {
    if (!this.equipoSeleccionado || !this.perfil) return;

    const exito = await this.activosService.generarPaseDeSalida(this.equipoSeleccionado, this.perfil.matricula);

    if (exito) {
      const toast = await this.toastCtrl.create({
        message: '✅ Pase generado con éxito. Tienes 10 minutos para cruzar.',
        duration: 3500,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      // Limpia la selección y recarga la lista
      this.equipoSeleccionado = '';
      this.equipoEscaneado = null;
      await this.cargarEquiposDisponibles();
    } else {
      const toast = await this.toastCtrl.create({
        message: '❌ Error al generar el pase. Intenta de nuevo.',
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    }
  }

  /**
   * Manejador de pull-to-refresh.
   */
  async handleRefresh(event: any): Promise<void> {
    this.perfil = await this.authService.getPerfilActual();
    await this.cargarEquiposDisponibles();
    await this.cargarPrestamosActivos();
    event.target.complete();
  }

  /**
   * Carga los préstamos activos del estudiante autenticado.
   */
  async cargarPrestamosActivos(): Promise<void> {
    if (!this.perfil) {
      this.prestamosActivos = [];
      return;
    }
    this.prestamosActivos = await this.activosService.getPrestamosActivosUsuario(this.perfil.matricula);
  }

  /**
   * Inicia el flujo de devolución: captura foto de evidencia,
   * la sube al storage y actualiza el registro.
   */
  async iniciarDevolucion(prestamoId: string): Promise<void> {
    try {
      const exito = await this.activosService.subirEvidenciaDevolucion(prestamoId);

      if (exito) {
        const toast = await this.toastCtrl.create({
          message: '📸 Evidencia registrada. Pasa por la puerta para completar la devolución.',
          duration: 4000,
          position: 'top',
          color: 'success',
        });
        await toast.present();
        await this.cargarPrestamosActivos();
      } else {
        const toast = await this.toastCtrl.create({
          message: '❌ No se pudo registrar la evidencia. Intenta de nuevo.',
          duration: 3500,
          position: 'top',
          color: 'danger',
        });
        await toast.present();
      }
    } catch (err) {
      console.error('Error en iniciarDevolucion:', err);
      const toast = await this.toastCtrl.create({
        message: '❌ Error inesperado al capturar la foto.',
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    }
  }
}
