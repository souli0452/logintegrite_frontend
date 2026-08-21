import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard basique : verifie que l'utilisateur est authentifie.
 * Lance le login Keycloak sinon.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  await auth.login();
  return false;
};

/**
 * Guard base sur les roles.
 * - Non authentifie -> redirect vers Keycloak
 * - Authentifie avec le bon role -> autorise
 * - Authentifie CONSULTANT sans le bon role -> redirect vers /registre-officiel (sa page d'accueil)
 * - Authentifie sans le bon role -> redirect vers /acces-refuse
 */
export const roleGuard = (...rolesRequis: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      auth.login();
      return false;
    }

    if (auth.hasAnyRole(...rolesRequis)) return true;

    // Un CONSULTANT qui tente d'aller ailleurs que le registre officiel
    // est ramene vers sa page d'accueil naturelle plutot que sur
    // /acces-refuse (qui serait deroutant pour lui).
    if (auth.hasRole('CONSULTANT')) {
      router.navigate(['/registre-officiel']);
    } else {
      router.navigate(['/acces-refuse']);
    }
    return false;
  };
};
