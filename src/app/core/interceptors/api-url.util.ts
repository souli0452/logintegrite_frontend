import { environment } from '../../../environments/environment';

/**
 * Vrai uniquement pour les requetes destinees a l'API Log Integrite.
 * Sert a ne jamais envoyer le jeton d'acces (ni reagir aux 401) pour une URL tierce.
 */
export function estRequeteApi(url: string): boolean {
  const base = environment.apiUrl.endsWith('/') ? environment.apiUrl : environment.apiUrl + '/';
  return url === environment.apiUrl || url.startsWith(base);
}
