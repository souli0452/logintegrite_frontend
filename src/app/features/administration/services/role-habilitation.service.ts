import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoleHabilitationResponse } from '../models/utilisateur.models';

@Injectable({ providedIn: 'root' })
export class RoleHabilitationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/roles-habilitation`;

  lister(): Observable<RoleHabilitationResponse[]> {
    return this.http.get<RoleHabilitationResponse[]>(this.baseUrl);
  }
}
