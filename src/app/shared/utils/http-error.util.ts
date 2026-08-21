// src/app/shared/utils/http-error.util.ts
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Le backend renvoie deux formats d'erreur differents :
 * - RFC7807 ProblemDetail (404 / 400 / validation) -> message utile dans `detail`,
 *   erreurs de champ dans `properties.erreurs`.
 * - Conflits d'integrite (409, doublons/contraintes FK) -> shape { status, error, message }.
 * Ce helper normalise les deux pour ne jamais perdre le message backend.
 */
export function messageErreurHttp(err: unknown, fallback: string): string {
  const reponse = err as HttpErrorResponse | undefined;
  const corps = reponse?.error as
    | { detail?: string; message?: string; properties?: { erreurs?: Record<string, string> } }
    | undefined;

  if (!corps) return fallback;

  const premiereErreurChamp = corps.properties?.erreurs
    ? Object.values(corps.properties.erreurs)[0]
    : undefined;

  return premiereErreurChamp ?? corps.detail ?? corps.message ?? fallback;
}
