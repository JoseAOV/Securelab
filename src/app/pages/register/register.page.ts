import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonInput,
  IonButton,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flaskOutline,
  idCardOutline,
  mailOutline,
  lockClosedOutline,
  informationCircleOutline,
  personAddOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
  ],
})
export class RegisterPage {
  matricula = '';
  email = '';
  password = '';
  cargando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
      flaskOutline,
      idCardOutline,
      mailOutline,
      lockClosedOutline,
      informationCircleOutline,
      personAddOutline,
    });
  }

  get formularioValido(): boolean {
    return !!(this.matricula && this.email && this.password);
  }

  async crearCuenta(): Promise<void> {
    if (!this.formularioValido) return;

    this.cargando = true;

    const disponible = await this.authService.matriculaDisponible(this.matricula.trim());
    if (!disponible) {
      this.cargando = false;
      await this.mostrarError(
        'Esa matrícula no es válida o ya tiene una cuenta registrada. Contacta a un administrador si crees que es un error.'
      );
      return;
    }

    const { error, necesitaConfirmarCorreo } = await this.authService.signUp(
      this.email.trim(),
      this.password,
      this.matricula.trim()
    );

    this.cargando = false;

    if (error) {
      await this.mostrarError(
        'No se pudo crear la cuenta. Verifica tus datos e intenta de nuevo.'
      );
      return;
    }

    if (necesitaConfirmarCorreo) {
      const toast = await this.toastCtrl.create({
        message: '✅ Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.',
        duration: 5000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    this.router.navigateByUrl('/folder/dashboard', { replaceUrl: true });
  }

  private async mostrarError(mensaje: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 4500,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
}
