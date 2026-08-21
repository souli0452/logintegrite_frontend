import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DossierRequest, DossierResponse,
  ImplicationRequest, ImplicationResponse,
  FaitReprocheRequest, FaitRejeteResponse, FaitReprocheResponse,
  PageResponse,
  DossierAValiderResponse // Import ajouté ici
} from '../models/dossier.models';

@Injectable({ providedIn: 'root' })
export class DossierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dossiers`;

  // ---- CRUD dossier ----

  lister(page = 0, size = 20): Observable<PageResponse<DossierResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<DossierResponse>>(this.baseUrl, { params });
  }

  obtenir(id: string): Observable<DossierResponse> {
    return this.http.get<DossierResponse>(`${this.baseUrl}/${id}`);
  }

  creer(request: DossierRequest): Observable<DossierResponse> {
    return this.http.post<DossierResponse>(this.baseUrl, request);
  }

  cloturer(id: string): Observable<DossierResponse> {
    return this.http.patch<DossierResponse>(`${this.baseUrl}/${id}/cloturer`, {});
  }

  // ---- Implications ----

  listerImplications(dossierId: string): Observable<ImplicationResponse[]> {
    return this.http.get<ImplicationResponse[]>(`${this.baseUrl}/${dossierId}/implications`);
  }

  ajouterImplication(dossierId: string, request: ImplicationRequest): Observable<ImplicationResponse> {
    return this.http.post<ImplicationResponse>(`${this.baseUrl}/${dossierId}/implications`, request);
  }

  supprimerImplication(dossierId: string, implicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${dossierId}/implications/${implicationId}`);
  }

  // ---- Faits reproches ----

  listerFaits(dossierId: string): Observable<FaitReprocheResponse[]> {
    return this.http.get<FaitReprocheResponse[]>(`${this.baseUrl}/${dossierId}/faits`);
  }

  ajouterFait(dossierId: string, request: FaitReprocheRequest): Observable<FaitReprocheResponse> {
    return this.http.post<FaitReprocheResponse>(`${this.baseUrl}/${dossierId}/faits`, request);
  }
  
  // ---- Validation des faits ----

  listerFaitsEnAttente(page = 0, size = 20): Observable<PageResponse<FaitReprocheResponse>> {
    const params = new HttpParams()
      .set('statutValidation', 'EN_ATTENTE')
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageResponse<FaitReprocheResponse>>(
      `${environment.apiUrl}/faits`,
      { params }
    );
  }

  validerFait(faitId: string): Observable<FaitReprocheResponse> {
  return this.http.put<FaitReprocheResponse>(
    `${environment.apiUrl}/faits/${faitId}/valider`,
    {}
  );
}

  rejeterFait(faitId: string, motif: string): Observable<FaitReprocheResponse> {
  return this.http.put<FaitReprocheResponse>(
    `${environment.apiUrl}/faits/${faitId}/rejeter`,
    { motifRejet: motif }
  );
}

  // ---- Validation globale par dossier ----

  /**
   * Liste les dossiers qui ont au moins un fait en attente de validation.
   * Renvoie la structure groupée avec les infos de la personne principale et la liste des faits.
   */
  listerDossiersAValider(): Observable<DossierAValiderResponse[]> {
    return this.http.get<DossierAValiderResponse[]>(
      `${environment.apiUrl}/validation/dossiers-avec-faits-en-attente`
    );
  }
  
  listerFaitsRejetes(): Observable<FaitRejeteResponse[]> {
  return this.http.get<FaitRejeteResponse[]>(`${environment.apiUrl}/faits/rejetes`);
}

reprendreFait(faitId: string): Observable<FaitReprocheResponse> {
  return this.http.put<FaitReprocheResponse>(
    `${environment.apiUrl}/faits/${faitId}/reprendre`, {}
  );
}
}
