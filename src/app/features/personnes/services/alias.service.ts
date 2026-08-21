import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AliasRequest, AliasResponse } from '../models/personne.models';

@Injectable({ providedIn: 'root' })
export class AliasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  lister(personneId: string): Observable<AliasResponse[]> {
    return this.http.get<AliasResponse[]>(`${this.baseUrl}/personnes/${personneId}/alias`);
  }

  creer(personneId: string, request: AliasRequest): Observable<AliasResponse> {
    return this.http.post<AliasResponse>(`${this.baseUrl}/personnes/${personneId}/alias`, request);
  }

  supprimer(aliasId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/alias/${aliasId}`);
  }
}
