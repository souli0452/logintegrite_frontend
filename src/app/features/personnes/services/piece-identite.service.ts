import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PieceIdentiteRequest, PieceIdentiteResponse } from '../models/personne.models';

@Injectable({ providedIn: 'root' })
export class PieceIdentiteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  lister(personnePhysiqueId: string): Observable<PieceIdentiteResponse[]> {
    return this.http.get<PieceIdentiteResponse[]>(`${this.baseUrl}/personnes/physiques/${personnePhysiqueId}/pieces-identite`);
  }

  creer(personnePhysiqueId: string, request: PieceIdentiteRequest): Observable<PieceIdentiteResponse> {
    return this.http.post<PieceIdentiteResponse>(`${this.baseUrl}/personnes/physiques/${personnePhysiqueId}/pieces-identite`, request);
  }

  supprimer(pieceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pieces-identite/${pieceId}`);
  }
}
