// src/app/features/personnes/services/personne-physique.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PersonnePhysiqueRequest, PersonnePhysiqueResponse } from '../models/personne.models';
import { VerificationNipResponse } from '../models/personne.models';


@Injectable({ providedIn: 'root' })
export class PersonnePhysiqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/personnes/physiques`;

  obtenir(id: string): Observable<PersonnePhysiqueResponse> {
    return this.http.get<PersonnePhysiqueResponse>(`${this.baseUrl}/${id}`);
  }
  
  /**
 * Vérifie en temps réel si un NIP est disponible ou déjà utilisé.
 * Utilisé par les formulaires pour l'anti-doublon.
 *
 * @param nip Le NIP à vérifier (17 caractères)
 * @param exclureId ID de la personne à exclure (utile en modification)
 */
verifierNip(nip: string, exclureId?: string): Observable<VerificationNipResponse> {
  const params: Record<string, string> = { nip };
  if (exclureId) params['exclureId'] = exclureId;
  return this.http.get<VerificationNipResponse>(`${this.baseUrl}/verifier-nip`, { params });
}

  creer(request: PersonnePhysiqueRequest): Observable<PersonnePhysiqueResponse> {
    return this.http.post<PersonnePhysiqueResponse>(this.baseUrl, request);
  }

  modifier(id: string, request: PersonnePhysiqueRequest): Observable<PersonnePhysiqueResponse> {
    return this.http.put<PersonnePhysiqueResponse>(`${this.baseUrl}/${id}`, request);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
