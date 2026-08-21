import { provideAppInitializer } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

// Instance unique de Keycloak, partagee dans toute l'app.
// Cree ici (fichier separe) pour eviter les imports circulaires
// entre keycloak-init, l'interceptor et le service d'auth.
export const keycloakInstance = new Keycloak({
  url: environment.keycloak.url,
  realm: environment.keycloak.realm,
  clientId: environment.keycloak.clientId
});

export function initializeKeycloak() {
  return provideAppInitializer(async () => {
    try {
      await keycloakInstance.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256'
      });
    } catch (error) {
      console.error('Echec init Keycloak', error);
    }
  });
}
