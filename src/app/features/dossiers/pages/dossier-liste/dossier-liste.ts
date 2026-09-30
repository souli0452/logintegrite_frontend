import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime } from 'rxjs';
import { LucideAngularModule, Plus, Eye, FolderOpen, Search, LucideIconData } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusBadge, StatusType } from '../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { DossierService } from '../../services/dossier.service';
import { DossierResponse, StatutDossier } from '../../models/dossier.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';
import { PaginatorFrancais } from '../../../../core/i18n/paginator-francais';

type FiltreStatut = StatutDossier | '';

@Component({
  selector: 'app-dossier-liste',
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }],
  standalone: true,
  imports: [
    DatePipe, RouterLink,
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
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly dossiers = signal<DossierResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(20);
  readonly chargement = signal(true);
  readonly recherche = signal('');
  readonly statut = signal<FiltreStatut>('');
  readonly filtreActif = computed(() => this.recherche().trim() !== '' || this.statut() !== '');

  readonly statuts: { valeur: FiltreStatut; libelle: string }[] = [
    { valeur: '', libelle: 'Tous' },
    { valeur: 'OUVERT', libelle: 'Ouverts' },
    { valeur: 'CLOTURE', libelle: 'Clôturés' }
  ];
  readonly colonnesAffichees = ['numero', 'intitule', 'source', 'statut', 'dateOuverture', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Plus, Eye, FolderOpen, Search };

  /** Saisies de recherche : on attend la fin de la frappe avant d'interroger le serveur. */
  private readonly saisies = new Subject<string>();

  constructor() {
    this.saisies.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((terme) => {
        this.recherche.set(terme);
        this.pageCourante.set(0);
        this.charger();
      });
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.lister(this.pageCourante(), this.taillePage(), this.recherche(), this.statut()).subscribe({
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

  saisir(terme: string): void {
    this.saisies.next(terme);
  }

  choisirStatut(valeur: FiltreStatut): void {
    if (valeur === this.statut()) return;
    this.statut.set(valeur);
    this.pageCourante.set(0);
    this.charger();
  }

  effacerFiltres(champ: HTMLInputElement): void {
    champ.value = '';
    this.recherche.set('');
    this.statut.set('');
    this.pageCourante.set(0);
    this.charger();
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
