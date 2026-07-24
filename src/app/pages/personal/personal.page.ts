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
  IonNote,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonToggle,
  ToastController,
  AlertController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  peopleSharp,
  searchOutline,
  searchSharp,
  checkmarkCircleOutline,
  checkmarkCircleSharp,
  timeOutline,
  timeSharp,
  addOutline,
  addSharp,
  closeOutline,
  closeSharp,
  saveOutline,
  saveSharp,
  idCardOutline,
  createOutline,
  trashOutline,
  banOutline,
} from 'ionicons/icons';
import { PersonasService } from '../../services/personas.service';
import { AuthService } from '../../services/auth.service';

const ROLES_VALIDOS = ['estudiante', 'docente', 'administrativo', 'intendente', 'laboratorista'];

@Component({
  selector: 'app-personal',
  templateUrl: './personal.page.html',
  styleUrls: ['./personal.page.scss'],
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
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonFab,
    IonFabButton,
    IonModal,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonToggle,
  ],
})
export class PersonalPage implements OnInit, ViewWillEnter {
  roles = ROLES_VALIDOS;

  personas: any[] = [];
  personasFiltradas: any[] = [];
  cargando = true;
  searchTerm = '';
  miMatricula: string | null = null;

  isModalOpen = false;
  modoEdicion = false;
  matriculaOriginal: string | null = null;
  personaForm: any = {
    matricula: '',
    nombre: '',
    rol: 'estudiante',
  };

  constructor(
    private personasService: PersonasService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      peopleOutline,
      peopleSharp,
      searchOutline,
      searchSharp,
      checkmarkCircleOutline,
      checkmarkCircleSharp,
      timeOutline,
      timeSharp,
      addOutline,
      addSharp,
      closeOutline,
      closeSharp,
      saveOutline,
      saveSharp,
      idCardOutline,
      createOutline,
      trashOutline,
      banOutline,
    });
  }

  ngOnInit(): void {}

  async ionViewWillEnter(): Promise<void> {
    const perfil = await this.authService.getPerfilActual();
    this.miMatricula = perfil?.matricula ?? null;
    await this.cargarPersonas();
  }

  async cargarPersonas(): Promise<void> {
    this.cargando = true;
    this.personas = await this.personasService.getTodasLasPersonas();
    this.filtrarPersonas();
    this.cargando = false;
  }

  async handleRefresh(event: any): Promise<void> {
    await this.cargarPersonas();
    event.target.complete();
  }

  filtrarPersonas(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.personasFiltradas = [...this.personas];
      return;
    }
    this.personasFiltradas = this.personas.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(term) ||
        p.matricula?.toLowerCase().includes(term) ||
        p.rol?.toLowerCase().includes(term)
    );
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value || '';
    this.filtrarPersonas();
  }

  esUnoMismo(persona: any): boolean {
    return !!this.miMatricula && persona.matricula === this.miMatricula;
  }

  abrirCrear(): void {
    this.modoEdicion = false;
    this.matriculaOriginal = null;
    this.personaForm = { matricula: '', nombre: '', rol: 'estudiante' };
    this.isModalOpen = true;
  }

  abrirEditar(persona: any): void {
    this.modoEdicion = true;
    this.matriculaOriginal = persona.matricula;
    this.personaForm = { matricula: persona.matricula, nombre: persona.nombre, rol: persona.rol };
    this.isModalOpen = true;
  }

  async guardarPersona(): Promise<void> {
    if (this.modoEdicion && this.matriculaOriginal) {
      const exito = await this.personasService.actualizarPersona(this.matriculaOriginal, {
        nombre: this.personaForm.nombre.trim(),
        rol: this.personaForm.rol,
      });

      if (exito) {
        await this.cargarPersonas();
        this.isModalOpen = false;
        await this.mostrarToast('Persona actualizada.', 'success');
      } else {
        await this.mostrarToast('Error al actualizar. Revisa la consola.', 'danger');
      }
      return;
    }

    const creada = await this.personasService.registrarPersona({
      matricula: this.personaForm.matricula.trim(),
      nombre: this.personaForm.nombre.trim(),
      rol: this.personaForm.rol,
    });

    if (creada) {
      await this.cargarPersonas();
      this.isModalOpen = false;
      await this.mostrarToast('Persona "' + creada.nombre + '" registrada exitosamente.', 'success');
    } else {
      await this.mostrarToast('Error al registrar. Verifica que la matrícula no exista ya.', 'danger');
    }
  }

  /**
   * Toggle "Cuenta activa" — checked = no baneada. No se permite sobre la
   * propia fila (evita que el laboratorista se bloquee a sí mismo).
   */
  async onToggleActiva(persona: any, event: any): Promise<void> {
    if (this.esUnoMismo(persona)) {
      event.target.checked = true;
      await this.mostrarToast('No puedes banear tu propia cuenta.', 'warning');
      return;
    }

    const activa: boolean = event.detail.checked;
    const exito = await this.personasService.cambiarBaneo(persona.matricula, !activa);

    if (exito) {
      persona.baneado = !activa;
      await this.mostrarToast(
        activa ? `Cuenta de "${persona.nombre}" reactivada.` : `Cuenta de "${persona.nombre}" baneada.`,
        activa ? 'success' : 'warning'
      );
    } else {
      event.target.checked = !activa;
      await this.mostrarToast('Error al cambiar el estado. Revisa la consola.', 'danger');
    }
  }

  async confirmarEliminar(persona: any): Promise<void> {
    if (this.esUnoMismo(persona)) {
      await this.mostrarToast('No puedes eliminar tu propia cuenta.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Eliminar persona',
      message: `¿Eliminar a "${persona.nombre}" (${persona.matricula})? Esto también borra su cuenta de acceso si tiene una. No se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarPersona(persona),
        },
      ],
    });
    await alert.present();
  }

  private async eliminarPersona(persona: any): Promise<void> {
    const { error } = await this.personasService.eliminarPersona(persona.matricula);

    if (!error) {
      await this.cargarPersonas();
      await this.mostrarToast(`"${persona.nombre}" eliminado.`, 'success');
    } else {
      await this.mostrarToast(error, 'danger');
    }
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
