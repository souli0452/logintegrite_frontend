import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CriteresVerification, DemandeExport, FicheVerification, ResultatVerification
} from './verification.models';

/** API de verification : la seule que peut appeler un compte de consultation, plus le traitement des demandes (admin). */
@Injectable({ providedIn: 'root' })
export class VerificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/verification`;

  rechercher(criteres: CriteresVerification): Observable<ResultatVerification[]> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(criteres)) {
      if (valeur !== undefined && valeur !== null && `${valeur}`.trim() !== '') params = params.set(cle, `${valeur}`.trim());
    }
    return this.http.get<ResultatVerification[]>(`${this.base}/recherche`, { params });
  }

  fiche(id: string): Observable<FicheVerification> {
    return this.http.get<FicheVerification>(`${this.base}/personnes/${id}`);
  }

  demanderExport(personneId: string, motif: string): Observable<DemandeExport> {
    return this.http.post<DemandeExport>(`${this.base}/personnes/${personneId}/demande-export`, { motif });
  }

  mesDemandes(): Observable<DemandeExport[]> {
    return this.http.get<DemandeExport[]>(`${this.base}/mes-demandes`);
  }

  // ---- administrateur
  demandes(statut?: string): Observable<DemandeExport[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<DemandeExport[]>(`${environment.apiUrl}/demandes-export`, { params });
  }

  decider(id: string, decision: 'ACCORDEE' | 'REFUSEE', commentaire?: string): Observable<DemandeExport> {
    return this.http.put<DemandeExport>(`${environment.apiUrl}/demandes-export/${id}/decision`, { decision, commentaire });
  }
}
