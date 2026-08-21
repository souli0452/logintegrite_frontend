import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PersonneResumeResponse,
  PersonnePhysiqueResponse,
  PersonneMoraleResponse,
  ImplicationResponse,
  FaitReprocheResponse,
  DossierResponse,
  DocumentResponse,
  PeineResponse,
  ImplicationFaitResume
} from '../models/personne.models';

export interface PersonneDetailComplet {
  resume: PersonneResumeResponse;
  detail: PersonnePhysiqueResponse | PersonneMoraleResponse;
  implications: ImplicationResponse[];
  dossiers: DossierResponse[];
  faits: FaitReprocheResponse[];
  documents: DocumentResponse[];
  peines: PeineResponse[];
  implicationFaits: ImplicationFaitResume[];   // NOUVEAU
}

// Forme exacte renvoyee par GET /personnes/{id}/dossier-complet
interface PersonneDossierCompletResponse {
  implications: ImplicationResponse[];
  dossiers: DossierResponse[];
  faits: FaitReprocheResponse[];
  documents: DocumentResponse[];
  peines?: PeineResponse[];
}

@Injectable({ providedIn: 'root' })
export class PersonneDetailService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  chargerToutesLesDonnees(personneId: string): Observable<PersonneDetailComplet> {
    return this.http.get<PersonneResumeResponse>(`${this.baseUrl}/personnes/${personneId}`).pipe(
      switchMap((resume) => this.chargerDetailSelonType(resume, personneId))
    );
  }

  private chargerDetailSelonType(
    resume: PersonneResumeResponse,
    personneId: string
  ): Observable<PersonneDetailComplet> {
    const endpointDetail = resume.typePersonne === 'PHYSIQUE'
      ? `${this.baseUrl}/personnes/physiques/${personneId}`
      : `${this.baseUrl}/personnes/morales/${personneId}`;

    return forkJoin({
      detail: this.http.get<PersonnePhysiqueResponse | PersonneMoraleResponse>(endpointDetail),
      dossierComplet: this.http.get<PersonneDossierCompletResponse>(
        `${this.baseUrl}/personnes/${personneId}/dossier-complet`
      ),
      implicationFaits: this.http.get<ImplicationFaitResume[]>(   // NOUVEAU
        `${this.baseUrl}/personnes/${personneId}/implication-faits`
      )
    }).pipe(
      map(({ detail, dossierComplet, implicationFaits }) => ({
        resume,
        detail,
        implications: dossierComplet.implications,
        dossiers: dossierComplet.dossiers,
        faits: dossierComplet.faits,
        documents: dossierComplet.documents,
        peines: dossierComplet.peines || [],
        implicationFaits: implicationFaits || []
      }))
    );
  }
}
