import { Component, inject, signal } from '@angular/core';
import { ChargementListe } from '../../../../../../shared/ui/chargement-liste/chargement-liste';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { AuditService } from '../../../../services/audit.service';
import { JournalConsultationResponse } from '../../../../models/audit.models';
import { PaginatorFrancais } from '../../../../../../core/i18n/paginator-francais';

@Component({
  selector: 'app-onglet-audit-consultations',
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }],
  standalone: true,
  imports: [ChargementListe, 
    DatePipe, SlicePipe,
    MatTableModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule,
    EmptyState
  ],
  templateUrl: './onglet-audit-consultations.html',
  styleUrl: './onglet-audit-consultations.scss'
})
export class OngletAuditConsultations {
  private readonly service = inject(AuditService);
  private readonly toastr = inject(ToastrService);

  readonly entries = signal<JournalConsultationResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(20);
  readonly chargement = signal(true);
  readonly filtreEntite = signal<string>('');
  readonly colonnesAffichees = ['dateConsultation', 'entite', 'utilisateur', 'adresseIp'];

  readonly entitesDisponibles = ['', 'Personne', 'Dossier', 'FaitReproche', 'Document'];

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.listerConsultations(
      this.pageCourante(),
      this.taillePage(),
      this.filtreEntite() || undefined
    ).subscribe({
      next: (page) => {
        this.entries.set(page.content);
        this.totalElements.set(page.totalElements);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error("Impossible de charger le journal de consultation");
        this.chargement.set(false);
      }
    });
  }

  changerPage(event: PageEvent): void {
    this.pageCourante.set(event.pageIndex);
    this.taillePage.set(event.pageSize);
    this.charger();
  }

  changerFiltreEntite(valeur: string): void {
    this.filtreEntite.set(valeur);
    this.pageCourante.set(0);
    this.charger();
  }
}
