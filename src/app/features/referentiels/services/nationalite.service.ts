import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NationaliteRequest, NationaliteResponse } from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class NationaliteService
  implements ReferentielCrudService<NationaliteResponse, NationaliteRequest> {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/nationalites`;

  // ─── Contrat CRUD standard ─────────────────────────────────────────────────
  lister(): Observable<NationaliteResponse[]> {
    return this.http.get<NationaliteResponse[]>(this.baseUrl);
  }

  creer(request: NationaliteRequest): Observable<NationaliteResponse> {
    return this.http.post<NationaliteResponse>(this.baseUrl, request);
  }

  modifier(id: string, request: NationaliteRequest): Observable<NationaliteResponse> {
    return this.http.put<NationaliteResponse>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ─── Méthodes additionnelles utiles aux formulaires ────────────────────────
  /** Liste uniquement les nationalités actives (pour les mat-select des formulaires). */
  listerActifs(): Observable<NationaliteResponse[]> {
    return this.http.get<NationaliteResponse[]>(`${this.baseUrl}/actifs`);
  }

  obtenir(id: string): Observable<NationaliteResponse> {
    return this.http.get<NationaliteResponse>(`${this.baseUrl}/${id}`);
  }
}
