import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DocumentResponse } from '../../personnes/models/personne.models';

export interface UploadProgress {
  type: 'progress' | 'done';
  pourcentage?: number;    // 0-100 quand type='progress'
  reponse?: DocumentResponse;  // presente quand type='done'
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Upload simple sans progression (compatible ancien usage)
  deposer(dossierId: string, fichier: File, typeDocumentId: string): Observable<DocumentResponse> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('typeDocumentId', typeDocumentId);
    return this.http.post<DocumentResponse>(
      `${this.baseUrl}/dossiers/${dossierId}/documents`,
      formData
    );
  }

  // Upload avec progression - emet des UploadProgress pendant l'upload
  deposerAvecProgression(
    dossierId: string,
    fichier: File,
    typeDocumentId: string
  ): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('typeDocumentId', typeDocumentId);

    const req = new HttpRequest(
      'POST',
      `${this.baseUrl}/dossiers/${dossierId}/documents`,
      formData,
      { reportProgress: true }
    );

    return this.http.request<DocumentResponse>(req).pipe(
      filter((event: HttpEvent<DocumentResponse>) =>
        event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response
      ),
      map((event: HttpEvent<DocumentResponse>): UploadProgress => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 1;
          return {
            type: 'progress',
            pourcentage: Math.round((event.loaded / total) * 100)
          };
        }
        // HttpEventType.Response
        return {
          type: 'done',
          reponse: (event as { body: DocumentResponse }).body
        };
      })
    );
  }
}
