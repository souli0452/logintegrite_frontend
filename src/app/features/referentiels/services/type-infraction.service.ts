import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TypeInfractionResponse } from '../models/referentiel.models';

export interface TypeInfractionRequest {
  libelle: string;
  actif: boolean;
  categorieInfractionId: string;
}

@Injectable({ providedIn: 'root' })
export class TypeInfractionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/referentiels/types-infraction`;

  lister(): Observable<TypeInfractionResponse[]> {
    return this.http.get<TypeInfractionResponse[]>(this.baseUrl);
  }
  creer(request: TypeInfractionRequest): Observable<TypeInfractionResponse> {
    return this.http.post<TypeInfractionResponse>(this.baseUrl, request);
  }
  modifier(id: string, request: TypeInfractionRequest): Observable<TypeInfractionResponse> {
    return this.http.put<TypeInfractionResponse>(`${this.baseUrl}/${id}`, request);
  }
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
