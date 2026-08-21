import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SourceSignalementResponse, ReferentielLibelleRequest } from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class SourceSignalementService implements ReferentielCrudService<SourceSignalementResponse, ReferentielLibelleRequest> {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/sources-signalement`;

  lister(): Observable<SourceSignalementResponse[]> {
    return this.http.get<SourceSignalementResponse[]>(this.baseUrl);
  }
  creer(request: ReferentielLibelleRequest): Observable<SourceSignalementResponse> {
    return this.http.post<SourceSignalementResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: ReferentielLibelleRequest): Observable<SourceSignalementResponse> {
    return this.http.put<SourceSignalementResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
