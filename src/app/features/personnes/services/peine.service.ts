import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PeineRequest, PeineResponse } from '../models/peine.models';

@Injectable({ providedIn: 'root' })
export class PeineService {
  private readonly http = inject(HttpClient);

  lister(implicationFaitId: string): Observable<PeineResponse[]> {
    return this.http.get<PeineResponse[]>(
      `${environment.apiUrl}/liaisons-faits/${implicationFaitId}/peines`
    );
  }

  creer(implicationFaitId: string, request: PeineRequest): Observable<PeineResponse> {
    return this.http.post<PeineResponse>(
      `${environment.apiUrl}/liaisons-faits/${implicationFaitId}/peines`,
      request
    );
  }
}
