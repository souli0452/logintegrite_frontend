import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PersonnePhotoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  deposer(personneId: string, fichier: File): Observable<void> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post<void>(`${this.baseUrl}/personnes/${personneId}/photo`, formData);
  }

  urlPhoto(personneId: string): string {
    return `${this.baseUrl}/personnes/${personneId}/photo`;
  }

  supprimer(personneId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/personnes/${personneId}/photo`);
  }
}
