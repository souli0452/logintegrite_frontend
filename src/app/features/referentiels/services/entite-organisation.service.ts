import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EntiteOrganisationResponse } from '../models/referentiel.models';

export interface EntiteOrganisationRequest {
  libelle: string;
  niveau: 'MINISTERE' | 'DIRECTION' | 'SERVICE';
  parentId?: string;
}

@Injectable({ providedIn: 'root' })
export class EntiteOrganisationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/entites-organisation`;

  lister(): Observable<EntiteOrganisationResponse[]> {
    return this.http.get<EntiteOrganisationResponse[]>(this.baseUrl);
  }
  creer(request: EntiteOrganisationRequest): Observable<EntiteOrganisationResponse> {
    return this.http.post<EntiteOrganisationResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: EntiteOrganisationRequest): Observable<EntiteOrganisationResponse> {
    return this.http.put<EntiteOrganisationResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
