import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AjouterDossierPersonneRequest {
  dossier: {
    numeroDossier?: string;
    intitule: string;
    descriptionContexte?: string;
    sourceSignalementId: string;
  };
  roleImplicationId: string;
  entiteOrganisationId?: string;
  fonctionOccupee?: string;
  statutJudiciaireId?: string;
  autoriteCompetente?: string;
  referenceAffaire?: string;
  faits: {
    typeInfractionId: string;
    zoneGeographiqueId?: string;
    description: string;
    montantPrejudice: number; 
    devise?: string;
    dateFaits: string;
  }[];
}

export interface AjouterDossierPersonneResponse {
  personneId: string;
  dossierId: string;
  implicationId: string;
  faitsIds: string[];
}

@Injectable({ providedIn: 'root' })
export class DossierWorkflowService {
  private readonly http = inject(HttpClient);

  ajouterDossierAPersonne(
    personneId: string,
    request: AjouterDossierPersonneRequest
  ): Observable<AjouterDossierPersonneResponse> {
    return this.http.post<AjouterDossierPersonneResponse>(
      `${environment.apiUrl}/personnes/${personneId}/dossiers`,
      request
    );
  }
}
