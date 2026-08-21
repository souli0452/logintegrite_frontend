import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { initializeKeycloak } from './core/auth/keycloak-init';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

// Enregistrement de la locale française pour Angular
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    // Définition de 'fr' comme langue globale par défaut
    { provide: LOCALE_ID, useValue: 'fr' },
    
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 4000,
      preventDuplicates: true,
      progressBar: true
    }),
    initializeKeycloak()
  ]
};
