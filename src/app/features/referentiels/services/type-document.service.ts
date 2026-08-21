import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TypeDocumentResponse, ReferentielLibelleRequest } from '../models/referentiel.models';
import { ReferentielCrudService } from './referentiel-crud.interface';

@Injectable({ providedIn: 'root' })
export class TypeDocumentService implements ReferentielCrudService<TypeDocumentResponse, ReferentielLibelleRequest> {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/types-document`;

  lister(): Observable<TypeDocumentResponse[]> {
    return this.http.get<TypeDocumentResponse[]>(this.baseUrl);
  }
  creer(request: ReferentielLibelleRequest): Observable<TypeDocumentResponse> {
    return this.http.post<TypeDocumentResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: ReferentielLibelleRequest): Observable<TypeDocumentResponse> {
    return this.http.put<TypeDocumentResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
