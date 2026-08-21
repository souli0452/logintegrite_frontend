import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ImplicationResponse,
  MiseAJourStatutJudiciaireRequest
} from '../../dossiers/models/dossier.models';

/**
 * Service dédié aux opérations transversales sur les implications
 * utilisées depuis la fiche personne.
 */
@Injectable({ providedIn: 'root' })
export class ImplicationService {
  private readonly http = inject(HttpClient);
  private readonly dossierUrl = `${environment.apiUrl}/dossiers`;
  private readonly liaisonsUrl = `${environment.apiUrl}/liaisons-faits`;

  /**
   * Met à jour le statut judiciaire d'une liaison implication-fait.
   * Endpoint réel : PUT /api/v1/liaisons-faits/{implicationFaitId}/statut
   *
   * Le statut est stocké sur ImplicationFait (chaque fait reproché peut avoir
   * son propre statut : condamné pour le fait A, relaxé pour le fait B, etc.).
   */
  mettreAJourStatut(
    implicationFaitId: string,
    payload: MiseAJourStatutJudiciaireRequest
  ): Observable<unknown> {
    return this.http.put(
      `${this.liaisonsUrl}/${implicationFaitId}/statut`,
      payload
    );
  }

  /**
   * Liste toutes les implications (donc toutes les personnes) d'un dossier.
   * Endpoint réel : GET /api/v1/dossiers/{dossierId}/implications
   */
  listerParDossier(dossierId: string): Observable<ImplicationResponse[]> {
    return this.http.get<ImplicationResponse[]>(
      `${this.dossierUrl}/${dossierId}/implications`
    );
  }
}
