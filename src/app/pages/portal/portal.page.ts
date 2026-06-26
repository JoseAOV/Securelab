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
  IonSelect,
  IonSelectOption,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
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
} from 'ionicons/icons';

import { ActivosService } from '../../services/activos.service';

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
    IonSelect,
    IonSelectOption,
    IonButton,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class PortalPage implements ViewWillEnter {
  equiposDisponibles: any[] = [];
  equipoSeleccionado: string = '';
  prestamosActivos: any[] = [];

  constructor(
    private activosService: ActivosService,
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
    });
  }

  /**
   * Carga los equipos disponibles cada vez que se entra a la vista.
   */
  async ionViewWillEnter(): Promise<void> {
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
   * Genera el pase de salida para el equipo seleccionado.
   */
  async solicitarPase(): Promise<void> {
    if (!this.equipoSeleccionado) return;

    const exito = await this.activosService.generarPaseDeSalida(this.equipoSeleccionado);

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
    await this.cargarEquiposDisponibles();
    await this.cargarPrestamosActivos();
    event.target.complete();
  }

  /**
   * Carga los préstamos activos del usuario hardcodeado.
   */
  async cargarPrestamosActivos(): Promise<void> {
    this.prestamosActivos = await this.activosService.getPrestamosActivosUsuario('202103001');
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
