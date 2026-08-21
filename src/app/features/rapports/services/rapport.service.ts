import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PersonneSearchParams } from '../../personnes/services/personne.service';

@Injectable({ providedIn: 'root' })
export class RapportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rapports`;

  pdfDossier(dossierId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/dossiers/${dossierId}/pdf`, {
      responseType: 'blob'
    });
  }

  pdfRegistreOfficiel(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/registre-officiel/pdf`, {
      responseType: 'blob'
    });
  }

  excelDossiers(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/dossiers/excel`, {
      responseType: 'blob'
    });
  }

  excelRecherchePersonnes(criteres: Partial<PersonneSearchParams>): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(criteres).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get(`${this.baseUrl}/personnes/excel`, {
      params, responseType: 'blob'
    });
  }

  // Utilitaire de telechargement
  telecharger(blob: Blob, nomFichier: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
