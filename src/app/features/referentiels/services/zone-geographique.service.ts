import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ZoneGeographiqueResponse } from '../models/referentiel.models';

export interface ZoneGeographiqueRequest {
  libelle: string;
  niveau: 'PAYS' | 'REGION' | 'PROVINCE' | 'COMMUNE';
  parentId?: string;
}

@Injectable({ providedIn: 'root' })
export class ZoneGeographiqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/zones-geographiques`;

  lister(): Observable<ZoneGeographiqueResponse[]> {
    return this.http.get<ZoneGeographiqueResponse[]>(this.baseUrl);
  }
  creer(request: ZoneGeographiqueRequest): Observable<ZoneGeographiqueResponse> {
    return this.http.post<ZoneGeographiqueResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: ZoneGeographiqueRequest): Observable<ZoneGeographiqueResponse> {
    return this.http.put<ZoneGeographiqueResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
