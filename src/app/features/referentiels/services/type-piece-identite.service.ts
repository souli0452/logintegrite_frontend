import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TypePieceIdentiteRequest,
  TypePieceIdentiteResponse
} from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class TypePieceIdentiteService
  implements ReferentielCrudService<TypePieceIdentiteResponse, TypePieceIdentiteRequest> {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/types-piece-identite`;

  // ─── Contrat CRUD standard ─────────────────────────────────────────────────
  lister(): Observable<TypePieceIdentiteResponse[]> {
    return this.http.get<TypePieceIdentiteResponse[]>(this.baseUrl);
  }

  creer(request: TypePieceIdentiteRequest): Observable<TypePieceIdentiteResponse> {
    return this.http.post<TypePieceIdentiteResponse>(this.baseUrl, request);
  }

  modifier(id: string, request: TypePieceIdentiteRequest): Observable<TypePieceIdentiteResponse> {
    return this.http.put<TypePieceIdentiteResponse>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ─── Additionnels ──────────────────────────────────────────────────────────
  /** Liste uniquement les types actifs — pour les mat-select des formulaires. */
  listerActifs(): Observable<TypePieceIdentiteResponse[]> {
    return this.http.get<TypePieceIdentiteResponse[]>(`${this.baseUrl}/actifs`);
  }

  obtenir(id: string): Observable<TypePieceIdentiteResponse> {
    return this.http.get<TypePieceIdentiteResponse>(`${this.baseUrl}/${id}`);
  }
}
