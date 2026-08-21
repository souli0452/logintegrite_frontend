import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardExecutifResponse } from '../models/statistiques.models';

@Injectable({ providedIn: 'root' })
export class StatistiquesService {
  private readonly http = inject(HttpClient);

  dashboardExecutif(): Observable<DashboardExecutifResponse> {
    return this.http.get<DashboardExecutifResponse>(
      `${environment.apiUrl}/statistiques/dashboard-executif`
    );
  }
}
