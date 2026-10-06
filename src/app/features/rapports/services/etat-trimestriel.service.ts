import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EtatTrimestrielResume, TrimestreOption } from '../models/etat-trimestriel.models';

export function libelleTrimestre(annee: number, trimestre: number): string {
  return `T${trimestre} ${annee}`;
}

/** Les `nombre` derniers trimestres TERMINES, du plus recent au plus ancien (le trimestre en cours est exclu). */
export function trimestresTermines(aujourdhui: Date, nombre: number): TrimestreOption[] {
  let annee = aujourdhui.getFullYear();
  let trimestre = Math.floor(aujourdhui.getMonth() / 3) + 1;
  const resultat: TrimestreOption[] = [];
  for (let i = 0; i < nombre; i++) {
    if (trimestre === 1) { annee -= 1; trimestre = 4; } else { trimestre -= 1; }
    resultat.push({ annee, trimestre, libelle: libelleTrimestre(annee, trimestre) });
  }
  return resultat;
}

@Injectable({ providedIn: 'root' })
export class EtatTrimestrielService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rapports/etats-trimestriels`;

  lister(): Observable<EtatTrimestrielResume[]> {
    return this.http.get<EtatTrimestrielResume[]>(this.baseUrl);
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  excel(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/excel`, { responseType: 'blob' });
  }

  generer(annee: number, trimestre: number): Observable<void> {
    const params = new HttpParams().set('annee', annee).set('trimestre', trimestre);
    return this.http.post<void>(`${this.baseUrl}/generer`, null, { params });
  }
}
