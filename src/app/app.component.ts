
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, shieldCheckmarkSharp, pulseOutline, pulseSharp, hardwareChipOutline, hardwareChipSharp, qrCodeOutline, qrCodeSharp, logOutOutline, logOutSharp, peopleOutline, peopleSharp, barChartOutline, barChartSharp } from 'ionicons/icons';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  public appPages = [
    { title: 'Dashboard', url: '/folder/dashboard', icon: 'pulse', soloAdmin: false },
    { title: 'Inventario', url: '/folder/inventario', icon: 'hardware-chip', soloAdmin: true },
    { title: 'Personal', url: '/folder/personal', icon: 'people', soloAdmin: true },
    { title: 'Reporte', url: '/folder/reporte', icon: 'bar-chart', soloAdmin: true },
    { title: 'Mi Portal', url: '/folder/portal', icon: 'qr-code', soloAdmin: false },
  ];

  esAdmin = false;

  constructor(private authService: AuthService, private router: Router) {
    addIcons({ shieldCheckmarkOutline, shieldCheckmarkSharp, pulseOutline, pulseSharp, hardwareChipOutline, hardwareChipSharp, qrCodeOutline, qrCodeSharp, logOutOutline, logOutSharp, peopleOutline, peopleSharp, barChartOutline, barChartSharp });
  }

  ngOnInit(): void {
    this.authService.session$.subscribe(async (session) => {
      if (!session) {
        this.esAdmin = false;
        return;
      }
      const perfil = await this.authService.getPerfilActual();
      this.esAdmin = perfil?.rol === 'laboratorista';
    });
  }

  get paginasVisibles() {
    return this.appPages.filter((p) => !p.soloAdmin || this.esAdmin);
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.signOut();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
