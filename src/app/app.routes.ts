import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'folder/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'folder/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },

  {
    path: 'folder/inventario',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/inventario/inventario.page').then((m) => m.InventarioPage),
  },
  {
    path: 'folder/personal',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/personal/personal.page').then((m) => m.PersonalPage),
  },
  {
    path: 'folder/reporte',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/reporte/reporte.page').then((m) => m.ReportePage),
  },
  {
    path: 'folder/portal',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/portal.page').then((m) => m.PortalPage),
  },
  {
    path: 'folder/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
];
