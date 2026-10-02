import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UtilisateurResponse, UtilisateurCreationRequest } from '../models/utilisateur.models';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/utilisateurs`;

  lister(): Observable<UtilisateurResponse[]> {
    return this.http.get<UtilisateurResponse[]>(this.baseUrl);
  }

  obtenir(id: string): Observable<UtilisateurResponse> {
    return this.http.get<UtilisateurResponse>(`${this.baseUrl}/${id}`);
  }

  creer(request: UtilisateurCreationRequest): Observable<UtilisateurResponse> {
    return this.http.post<UtilisateurResponse>(this.baseUrl, request);
  }

  modifierActivation(id: string, actif: boolean): Observable<UtilisateurResponse> {
    return this.http.patch<UtilisateurResponse>(`${this.baseUrl}/${id}/activation`, { actif });
  }

  /** Fixe ou prolonge l'expiration d'un compte (date AAAA-MM-JJ), ou la retire (null). */
  modifierExpiration(id: string, dateExpiration: string | null): Observable<UtilisateurResponse> {
    return this.http.patch<UtilisateurResponse>(`${this.baseUrl}/${id}/expiration`, { dateExpiration });
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  attribuerRole(utilisateurId: string, roleHabilitationId: string): Observable<UtilisateurResponse> {
    return this.http.post<UtilisateurResponse>(
      `${this.baseUrl}/${utilisateurId}/roles/${roleHabilitationId}`, {}
    );
  }

  retirerRole(utilisateurId: string, roleHabilitationId: string): Observable<UtilisateurResponse> {
    return this.http.delete<UtilisateurResponse>(
      `${this.baseUrl}/${utilisateurId}/roles/${roleHabilitationId}`
    );
  }
}
