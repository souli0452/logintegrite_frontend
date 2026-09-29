// src/app/shared/utils/http-error.util.ts
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Le backend renvoie des erreurs au format RFC 9457 (ProblemDetail) :
 * - `detail` / `message` : message utile pour l'utilisateur ;
 * - `erreurs` : erreurs de validation par champ (Spring place les proprietes au premier niveau du JSON).
 * L'ancien format `properties.erreurs` reste lu pour compatibilite.
 * Ce helper normalise le tout pour ne jamais perdre le message backend.
 */
export function messageErreurHttp(err: unknown, fallback: string): string {
  const reponse = err as HttpErrorResponse | undefined;
  const corps = reponse?.error as
    | {
        detail?: string;
        message?: string;
        erreurs?: Record<string, string>;
        properties?: { erreurs?: Record<string, string> };
      }
    | undefined;

  if (!corps || typeof corps !== 'object') return fallback;

  const erreursChamps = corps.erreurs ?? corps.properties?.erreurs;
  const premiereErreurChamp = erreursChamps ? Object.values(erreursChamps)[0] : undefined;

  return premiereErreurChamp ?? corps.detail ?? corps.message ?? fallback;
}
