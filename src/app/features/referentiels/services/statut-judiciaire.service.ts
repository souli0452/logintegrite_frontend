import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StatutJudiciaireResponse, ReferentielSimpleRequest } from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class StatutJudiciaireService implements ReferentielCrudService<StatutJudiciaireResponse, ReferentielSimpleRequest> {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/statuts-judiciaires`;

  lister(): Observable<StatutJudiciaireResponse[]> {
    return this.http.get<StatutJudiciaireResponse[]>(this.baseUrl);
  }
  creer(request: ReferentielSimpleRequest): Observable<StatutJudiciaireResponse> {
    return this.http.post<StatutJudiciaireResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: ReferentielSimpleRequest): Observable<StatutJudiciaireResponse> {
    return this.http.put<StatutJudiciaireResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
