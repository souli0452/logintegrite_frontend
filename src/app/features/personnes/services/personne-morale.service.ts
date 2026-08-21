// src/app/features/personnes/services/personne-morale.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PersonneMoraleRequest, PersonneMoraleResponse } from '../models/personne.models';

@Injectable({ providedIn: 'root' })
export class PersonneMoraleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/personnes/morales`;

  obtenir(id: string): Observable<PersonneMoraleResponse> {
    return this.http.get<PersonneMoraleResponse>(`${this.baseUrl}/${id}`);
  }

  creer(request: PersonneMoraleRequest): Observable<PersonneMoraleResponse> {
    return this.http.post<PersonneMoraleResponse>(this.baseUrl, request);
  }

  modifier(id: string, request: PersonneMoraleRequest): Observable<PersonneMoraleResponse> {
    return this.http.put<PersonneMoraleResponse>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
