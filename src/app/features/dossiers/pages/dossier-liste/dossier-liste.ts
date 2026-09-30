import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Plus, Eye, FolderOpen, LucideIconData } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusBadge, StatusType } from '../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { DossierService } from '../../services/dossier.service';
import { DossierResponse, StatutDossier } from '../../models/dossier.models';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';

@Component({
  selector: 'app-dossier-liste',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatPaginatorModule, MatTooltipModule, NomAccessibleInfobulle, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, StatusBadge, EmptyState
  ],
  templateUrl: './dossier-liste.html',
  styleUrl: './dossier-liste.scss'
})
export class DossierListe {
  private readonly service = inject(DossierService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  readonly dossiers = signal<DossierResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(20);
  readonly chargement = signal(true);
  readonly colonnesAffichees = ['numero', 'intitule', 'source', 'statut', 'dateOuverture', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Plus, Eye, FolderOpen };

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.lister(this.pageCourante(), this.taillePage()).subscribe({
      next: (page) => {
        this.dossiers.set(page.content);
        this.totalElements.set(page.totalElements);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les dossiers');
        this.chargement.set(false);
      }
    });
  }

  changerPage(event: PageEvent): void {
    this.pageCourante.set(event.pageIndex);
    this.taillePage.set(event.pageSize);
    this.charger();
  }

  typeStatut(statut: StatutDossier): StatusType {
    return statut === 'OUVERT' ? 'success' : 'neutral';
  }

  voir(dossier: DossierResponse): void {
    this.router.navigate(['/dossiers', dossier.id]);
  }

  
}
