import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse, PersonneResumeResponse, PersonneDocumentResponse } from '../models/personne.models';

export interface PersonneSearchParams {
  page: number;
  size: number;
  nomOuDenomination?: string;
  typePersonne?: 'PHYSIQUE' | 'MORALE';
  nationalite?: string;
  numeroPieceIdentite?: string;
  rccm?: string;
  ifu?: string;
  typeInfractionId?: string;
  zoneGeographiqueId?: string;
  statutJudiciaireId?: string;
  entiteOrganisationId?: string;
  fonction?: string;
  periodeDebut?: string;
  periodeFin?: string;
  statutAncrage?: 'EN_INSTRUCTION' | 'REGISTRE_OFFICIEL'; // Ajout du champ optionnel
}

@Injectable({ providedIn: 'root' })
export class PersonneService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/personnes`;

  // Recherche avancee - envoie tous les criteres non vides au backend
  rechercheAvancee(criteres: PersonneSearchParams): Observable<PageResponse<PersonneResumeResponse>> {
    let params = new HttpParams()
      .set('page', criteres.page.toString())
      .set('size', criteres.size.toString());

    // On n'envoie que les criteres definis - evite d'ajouter des ?nom=&type=&... vides
    if (criteres.nomOuDenomination) params = params.set('nomOuDenomination', criteres.nomOuDenomination);
    if (criteres.typePersonne) params = params.set('typePersonne', criteres.typePersonne);
    if (criteres.nationalite) params = params.set('nationalite', criteres.nationalite);
    if (criteres.numeroPieceIdentite) params = params.set('numeroPieceIdentite', criteres.numeroPieceIdentite);
    if (criteres.rccm) params = params.set('rccm', criteres.rccm);
    if (criteres.ifu) params = params.set('ifu', criteres.ifu);
    if (criteres.typeInfractionId) params = params.set('typeInfractionId', criteres.typeInfractionId);
    if (criteres.zoneGeographiqueId) params = params.set('zoneGeographiqueId', criteres.zoneGeographiqueId);
    if (criteres.statutJudiciaireId) params = params.set('statutJudiciaireId', criteres.statutJudiciaireId);
    if (criteres.entiteOrganisationId) params = params.set('entiteOrganisationId', criteres.entiteOrganisationId);
    if (criteres.fonction) params = params.set('fonction', criteres.fonction);
    if (criteres.periodeDebut) params = params.set('periodeDebut', criteres.periodeDebut);
    if (criteres.periodeFin) params = params.set('periodeFin', criteres.periodeFin);
    if (criteres.statutAncrage) params = params.set('statutAncrage', criteres.statutAncrage); // Ajout de la liaison du paramètre

    return this.http.get<PageResponse<PersonneResumeResponse>>(`${this.baseUrl}/recherche`, { params });
  }

  // Liste tous les documents des dossiers ou cette personne est impliquee.
  // Chaque document est enrichi du numero et de l'intitule du dossier concerne.
  listerDocuments(personneId: string): Observable<PersonneDocumentResponse[]> {
    return this.http.get<PersonneDocumentResponse[]>(`${this.baseUrl}/${personneId}/documents`);
  }
  
  // Liste les personnes en instruction (aucun dossier entierement valide)
  listerEnInstruction(page: number, size: number): Observable<PageResponse<PersonneResumeResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageResponse<PersonneResumeResponse>>(
      `${this.baseUrl}/en-instruction`,
      { params }
    );
  }

  // Liste les personnes du registre officiel (au moins un dossier entierement valide)
  listerRegistreOfficiel(page: number, size: number): Observable<PageResponse<PersonneResumeResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageResponse<PersonneResumeResponse>>(
      `${this.baseUrl}/registre-officiel`,
      { params }
    );
  }
}
