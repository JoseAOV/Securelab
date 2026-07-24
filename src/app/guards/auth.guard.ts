import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!(await authService.isAuthenticated())) {
    return router.parseUrl('/login');
  }

  // Defensa en cada navegación: si la cuenta fue baneada o eliminada
  // mientras ya tenía sesión abierta, pierde el acceso de inmediato en
  // vez de esperar a que cierre y vuelva a iniciar sesión.
  const perfil = await authService.getPerfilActual();
  if (!perfil || perfil.baneado) {
    await authService.signOut();
    return router.parseUrl('/login');
  }

  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const perfil = await authService.getPerfilActual();
  if (perfil?.rol === 'laboratorista') {
    return true;
  }
  return router.parseUrl('/folder/dashboard');
};
