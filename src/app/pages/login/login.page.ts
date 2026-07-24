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
  IonCheckbox,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flaskOutline,
  mailOutline,
  lockClosedOutline,
  arrowForwardOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
    IonCheckbox,
  ],
})
export class LoginPage {
  email = '';
  password = '';
  mantenerSesion = true;
  cargando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ flaskOutline, mailOutline, lockClosedOutline, arrowForwardOutline });
  }

  async iniciarSesion(): Promise<void> {
    if (!this.email || !this.password) return;

    this.cargando = true;
    const { error } = await this.authService.signIn(this.email, this.password);
    this.cargando = false;

    if (error) {
      const toast = await this.toastCtrl.create({
        message: 'No se pudo iniciar sesión. Verifica tu correo y contraseña.',
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
      return;
    }

    this.router.navigateByUrl('/folder/dashboard', { replaceUrl: true });
  }

  async olvideContrasena(): Promise<void> {
    if (!this.email) {
      const toast = await this.toastCtrl.create({
        message: 'Escribe tu correo arriba y vuelve a tocar "¿Olvidó su contraseña?".',
        duration: 3000,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const { error } = await this.authService.solicitarRecuperacionContrasena(this.email);
    const toast = await this.toastCtrl.create({
      message: error
        ? 'No se pudo enviar el correo de recuperación. Intenta de nuevo.'
        : 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.',
      duration: 4000,
      position: 'top',
      color: error ? 'danger' : 'success',
    });
    await toast.present();
  }
}
