import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'folder/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'folder/dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'folder/inventario',
    loadComponent: () =>
      import('./pages/inventario/inventario.page').then((m) => m.InventarioPage),
  },
  {
    path: 'folder/portal',
    loadComponent: () =>
      import('./pages/portal/portal.page').then((m) => m.PortalPage),
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
];
