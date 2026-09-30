import { Component, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Hash, Info, LucideIconData } from 'lucide-angular';

import { StatusBadge, StatusType } from '../../../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { AuditService } from '../../../../services/audit.service';
import { JournalAuditResponse } from '../../../../models/audit.models';
import { PaginatorFrancais } from '../../../../../../core/i18n/paginator-francais';

@Component({
  selector: 'app-onglet-audit-modifications',
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }],
  standalone: true,
  imports: [
    DatePipe,SlicePipe,
    MatTableModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule, MatButtonModule,
    LucideAngularModule,
    StatusBadge, EmptyState
  ],
  templateUrl: './onglet-audit-modifications.html',
  styleUrl: './onglet-audit-modifications.scss'
})
export class OngletAuditModifications {
  private readonly service = inject(AuditService);
  private readonly toastr = inject(ToastrService);

  readonly entries = signal<JournalAuditResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(20);
  readonly chargement = signal(true);
  readonly filtreEntite = signal<string>('');
  readonly colonnesAffichees = ['dateAction', 'action', 'entite', 'utilisateur', 'hash'];
  readonly icons: Record<string, LucideIconData> = { Hash, Info };

  readonly entitesDisponibles = ['', 'Personne', 'Dossier', 'FaitReproche', 'Implication', 'Document', 'Utilisateur'];

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.listerAudit(
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
        this.toastr.error("Impossible de charger le journal d'audit");
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

  private static readonly ACTIONS_POSITIVES = new Set([
    'CREATION', 'DEPOT', 'VALIDATION', 'OUVERTURE_DOSSIER', 'ATTRIBUTION_ROLE'
  ]);
  private static readonly ACTIONS_NEGATIVES = new Set([
    'SUPPRESSION', 'REJET', 'RETRAIT_ROLE', 'RETRAIT_TAG_DOCUMENT'
  ]);

  typeAction(action: string): StatusType {
    if (OngletAuditModifications.ACTIONS_POSITIVES.has(action)) return 'success';
    if (OngletAuditModifications.ACTIONS_NEGATIVES.has(action)) return 'danger';
    return 'warning'; // MODIFICATION, TAG_DOCUMENT, MODIFICATION_STATUT_JUDICIAIRE...
  }

  // Format court du hash pour affichage tabulaire (8 premiers caractères)
  hashCourt(hash: string): string {
    return hash.substring(0, 8) + '...';
  }
}
