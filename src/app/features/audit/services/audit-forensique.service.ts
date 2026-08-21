import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  EtatChaineResponse,
  KpiForensiqueResponse,
  VerificationChaineResponse,
  VerificationMaillonResponse
} from '../models/audit.models';

/**
 * Service dédié aux endpoints forensiques /api/v1/audit/forensique/*.
 * Ne pas mélanger avec AuditService (qui gère l'historique paginé classique).
 */
@Injectable({ providedIn: 'root' })
export class AuditForensiqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit/forensique`;

  /** Instantané synthétique de la chaîne — pour le bandeau haut d'écran. */
  etatChaine(): Observable<EtatChaineResponse> {
    return this.http.get<EtatChaineResponse>(`${this.baseUrl}/etat-chaine`);
  }

  /**
   * Recalcule tous les hashs et retourne les éventuelles ruptures.
   * Opération potentiellement longue — à déclencher via le bouton dédié.
   */
  verifierChaine(limiteLignes?: number): Observable<VerificationChaineResponse> {
    const params: Record<string, string> = {};
    if (limiteLignes !== undefined && limiteLignes !== null) {
      params['limiteLignes'] = String(limiteLignes);
    }
    return this.http.post<VerificationChaineResponse>(
      `${this.baseUrl}/verifier-chaine`,
      null,
      { params }
    );
  }

  /**
   * Vérifie un maillon isolé par son hash (complet ou préfixe hexadécimal).
   * Utilisé par le drawer latéral "Vérifier un hash".
   */
  verifierMaillon(hash: string): Observable<VerificationMaillonResponse> {
    return this.http.get<VerificationMaillonResponse>(
      `${this.baseUrl}/verifier-maillon`,
      { params: { hash } }
    );
  }

  /** KPI forensiques agrégés — pour les 4 cartes du haut d'écran. */
  kpiForensique(heureOuverture = 7, heureFermeture = 18): Observable<KpiForensiqueResponse> {
    return this.http.get<KpiForensiqueResponse>(`${this.baseUrl}/kpi`, {
      params: {
        heureOuverture: String(heureOuverture),
        heureFermeture: String(heureFermeture)
      }
    });
  }
}
