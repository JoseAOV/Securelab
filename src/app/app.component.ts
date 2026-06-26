
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonRouterLink } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, shieldCheckmarkSharp, pulseOutline, pulseSharp, hardwareChipOutline, hardwareChipSharp, qrCodeOutline, qrCodeSharp } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent {
  public appPages = [
    { title: 'Dashboard', url: '/folder/dashboard', icon: 'pulse' },
    { title: 'Inventario', url: '/folder/inventario', icon: 'hardware-chip' },
    { title: 'Mi Portal', url: '/folder/portal', icon: 'qr-code' },
  ];

  constructor() {
    addIcons({ shieldCheckmarkOutline, shieldCheckmarkSharp, pulseOutline, pulseSharp, hardwareChipOutline, hardwareChipSharp, qrCodeOutline, qrCodeSharp });
  }
}
