import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { keycloakInstance } from '../auth/keycloak-init';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return next(req);

  // updateToken(30) : renouvelle le token s'il expire dans moins de 30s.
  // Evite les 401 en pleine navigation (le JWT dure 5 min par defaut).
  return from(keycloakInstance.updateToken(30).catch(() => false)).pipe(
    switchMap(() => {
      const token = auth.getToken();
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(authReq);
    })
  );
};
