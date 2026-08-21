import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoleImplicationResponse, ReferentielSimpleRequest } from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class RoleImplicationService implements ReferentielCrudService<RoleImplicationResponse, ReferentielSimpleRequest> {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/roles-implication`;

  lister(): Observable<RoleImplicationResponse[]> {
    return this.http.get<RoleImplicationResponse[]>(this.baseUrl);
  }
  creer(request: ReferentielSimpleRequest): Observable<RoleImplicationResponse> {
    return this.http.post<RoleImplicationResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: ReferentielSimpleRequest): Observable<RoleImplicationResponse> {
    return this.http.put<RoleImplicationResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
