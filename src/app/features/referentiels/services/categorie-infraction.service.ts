import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CategorieInfractionRequest, CategorieInfractionResponse } from '../models/referentiel.models';

@Injectable({ providedIn: 'root' })
export class CategorieInfractionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/categories-infraction`;

  lister(): Observable<CategorieInfractionResponse[]> {
    return this.http.get<CategorieInfractionResponse[]>(this.baseUrl);
  }

  creer(request: CategorieInfractionRequest): Observable<CategorieInfractionResponse> {
    return this.http.post<CategorieInfractionResponse>(this.baseUrl, request);
  }

  modifier(id: string, request: CategorieInfractionRequest): Observable<CategorieInfractionResponse> {
    return this.http.put<CategorieInfractionResponse>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
