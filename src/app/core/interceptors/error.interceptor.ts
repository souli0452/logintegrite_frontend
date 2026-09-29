import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { estRequeteApi } from './api-url.util';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Seules les reponses de notre API declenchent une reconnexion ou une redirection.
      if (estRequeteApi(req.url)) {
        if (error.status === 401) {
          auth.login();
        } else if (error.status === 403) {
          router.navigate(['/acces-refuse']);
        }
      }
      // On propage toujours l'erreur, libre au composant de la gerer.
      return throwError(() => error);
    })
  );
};
