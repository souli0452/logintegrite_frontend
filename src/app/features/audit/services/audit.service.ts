import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JournalAuditResponse, JournalConsultationResponse, PageResponse } from '../models/audit.models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit`;

  listerAudit(page = 0, size = 20, entiteCible?: string): Observable<PageResponse<JournalAuditResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (entiteCible) params = params.set('entiteCible', entiteCible);
    return this.http.get<PageResponse<JournalAuditResponse>>(`${this.baseUrl}/journal-audit`, { params });
  }

  listerConsultations(page = 0, size = 20, entiteConsultee?: string): Observable<PageResponse<JournalConsultationResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (entiteConsultee) params = params.set('entiteConsultee', entiteConsultee);
    return this.http.get<PageResponse<JournalConsultationResponse>>(`${this.baseUrl}/journal-consultation`, { params });
  }
}
