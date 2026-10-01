import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { ChargementListe } from '../../../../shared/ui/chargement-liste/chargement-liste';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { animate, state, style, transition, trigger } from '@angular/animations';
import {
  LucideAngularModule, Plus, Eye, User, Building2, Users,
  Search, FolderOpen, FileText, Trash2, Filter, Pencil, Scale,
  LucideIconData
} from 'lucide-angular';

import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import { PersonneService, PersonneSearchParams } from '../../services/personne.service';
import { PersonnePhysiqueService } from '../../services/personne-physique.service';
import { PersonneMoraleService } from '../../services/personne-morale.service';
import { PersonneDetailService, PersonneDetailComplet } from '../../services/personne-detail.service';
import { PersonneResumeResponse, PersonnePhysiqueResponse, PersonneMoraleResponse } from '../../models/personne.models';
import { PersonnePhysiqueFormDialog } from '../personne-physique-form-dialog/personne-physique-form-dialog';
import { PersonneMoraleFormDialog } from '../personne-morale-form-dialog/personne-morale-form-dialog';
import { PaginatorFrancais } from '../../../../core/i18n/paginator-francais';

type FiltreType = 'TOUS' | 'PHYSIQUE' | 'MORALE';
type FiltreAncrage = 'TOUS' | 'EN_INSTRUCTION' | 'REGISTRE_OFFICIEL';

@Component({
  selector: 'app-personne-liste',
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }],
  standalone: true,
  imports: [ChargementListe, 
    RouterLink, DatePipe,
    MatTableModule, MatButtonModule, MatPaginatorModule, MatProgressSpinnerModule,
    LucideAngularModule,
    EmptyState
  ],
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('220ms cubic-bezier(0.4,0,0.2,1)'))
    ])
  ],
  templateUrl: './personne-liste.html',
  styleUrl: './personne-liste.scss'
})
export class PersonneListe implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Arrive depuis "Nouveau dossier" : un dossier se cree depuis la fiche de la personne concernee. */
  readonly pourDossier = this.route.snapshot.queryParamMap.get('pour') === 'dossier';
  private readonly service = inject(PersonneService);
  private readonly servicePhysique = inject(PersonnePhysiqueService);
  private readonly serviceMorale = inject(PersonneMoraleService);
  private readonly detailService = inject(PersonneDetailService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  readonly icons: Record<string, LucideIconData> = {
    Plus, Eye, User, Building2, Users, Search, FolderOpen,
    FileText, Trash2, Filter, Pencil, Scale
  };

  // Etat liste
  readonly personnes = signal<PersonneResumeResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(10);
  readonly chargement = signal(true);

  // Filtres
  readonly filtreType = signal<FiltreType>('TOUS');
  readonly filtreAncrage = signal<FiltreAncrage>('TOUS');
  readonly termeRecherche = signal('');

  // Ligne developpee
  readonly personneDeveloppee = signal<PersonneResumeResponse | null>(null);
  readonly detailDeveloppe = signal<PersonneDetailComplet | null>(null);
  readonly chargementDetail = signal(false);

  // 4 colonnes epurees : le nom porte l'identifiant, le statut porte le contexte,
  // les dossiers valides sont l'indicateur cle, la date d'inscription complete
  readonly colonnesAffichees = ['personne', 'statut', 'dossiers', 'inscription', 'actions'];

  readonly debutAffichage = computed(() =>
    this.totalElements() === 0 ? 0 : this.pageCourante() * this.taillePage() + 1
  );

  readonly finAffichage = computed(() =>
    Math.min((this.pageCourante() + 1) * this.taillePage(), this.totalElements())
  );

  private readonly rechercheSubject = new Subject<string>();
  private readonly rechercheSubscription: Subscription;

  constructor() {
    // Debounce sur la recherche pour ne pas appeler le backend a chaque touche
    this.rechercheSubscription = this.rechercheSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageCourante.set(0);
      this.charger();
    });

    this.charger();
  }

  ngOnDestroy(): void {
    this.rechercheSubscription.unsubscribe();
  }

  charger(): void {
    this.chargement.set(true);

    const type = this.filtreType();
    const ancrage = this.filtreAncrage();
    const criteres: PersonneSearchParams = {
      page: this.pageCourante(),
      size: this.taillePage(),
      nomOuDenomination: this.termeRecherche().trim() || undefined,
      typePersonne: type === 'TOUS' ? undefined : type,
      statutAncrage: ancrage === 'TOUS' ? undefined : ancrage
    };

    this.service.rechercheAvancee(criteres).subscribe({
      next: (page) => {
        this.personnes.set(page.content);
        this.totalElements.set(page.totalElements);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les personnes');
        this.chargement.set(false);
      }
    });
  }

  changerPage(event: PageEvent): void {
    this.pageCourante.set(event.pageIndex);
    this.taillePage.set(event.pageSize);
    this.personneDeveloppee.set(null);
    this.detailDeveloppe.set(null);
    this.charger();
  }

  changerFiltreType(type: FiltreType): void {
    this.filtreType.set(type);
    this.personneDeveloppee.set(null);
    this.pageCourante.set(0);
    this.charger();
  }

  changerFiltreAncrage(ancrage: FiltreAncrage): void {
    this.filtreAncrage.set(ancrage);
    this.personneDeveloppee.set(null);
    this.pageCourante.set(0);
    this.charger();
  }

  changerRecherche(valeur: string): void {
    this.termeRecherche.set(valeur);
    this.personneDeveloppee.set(null);
    this.rechercheSubject.next(valeur);
  }

  basculerDetail(personne: PersonneResumeResponse): void {
    if (this.personneDeveloppee()?.id === personne.id) {
      this.personneDeveloppee.set(null);
      this.detailDeveloppe.set(null);
      return;
    }

    this.personneDeveloppee.set(personne);
    this.detailDeveloppe.set(null);
    this.chargementDetail.set(true);

    this.detailService.chargerToutesLesDonnees(personne.id).subscribe({
      next: (data) => {
        this.detailDeveloppe.set(data);
        this.chargementDetail.set(false);
      },
      error: () => this.chargementDetail.set(false)
    });
  }

  voir(personne: PersonneResumeResponse, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/personnes', personne.id]);
  }

  editer(personne: PersonneResumeResponse, event: Event): void {
    event.stopPropagation();
    if (personne.typePersonne === 'PHYSIQUE') {
      this.servicePhysique.obtenir(personne.id).subscribe({
        next: (detail) => this.ouvrirDialogPhysique(detail),
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Impossible de charger la fiche'))
      });
    } else {
      this.serviceMorale.obtenir(personne.id).subscribe({
        next: (detail) => this.ouvrirDialogMorale(detail),
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Impossible de charger la fiche'))
      });
    }
  }

  private ouvrirDialogPhysique(existant: PersonnePhysiqueResponse): void {
    const ref = this.dialog.open(PersonnePhysiqueFormDialog, { width: '700px', data: existant });
    ref.afterClosed().subscribe((request) => {
      if (!request) return;
      this.servicePhysique.modifier(existant.id, request).subscribe({
        next: () => { this.toastr.success('Personne physique modifiée'); this.charger(); },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Échec de la modification'))
      });
    });
  }

  private ouvrirDialogMorale(existant: PersonneMoraleResponse): void {
    const ref = this.dialog.open(PersonneMoraleFormDialog, { width: '700px', data: existant });
    ref.afterClosed().subscribe((request) => {
      if (!request) return;
      this.serviceMorale.modifier(existant.id, request).subscribe({
        next: () => { this.toastr.success('Personne morale modifiée'); this.charger(); },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Échec de la modification'))
      });
    });
  }

  supprimer(personne: PersonneResumeResponse, event: Event): void {
    event.stopPropagation();
    this.confirmation.demander({
      titre: 'Supprimer la personne',
      message: `Supprimer definitivement "${personne.nomAffichage}" ?`,
      detail: 'Cette action est irreversible. Une personne deja impliquee dans un dossier ne peut pas etre supprimee.',
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      const service$ = personne.typePersonne === 'PHYSIQUE'
        ? this.servicePhysique.supprimer(personne.id)
        : this.serviceMorale.supprimer(personne.id);
      service$.subscribe({
        next: () => {
          this.toastr.success('Personne supprimée');
          if (this.personneDeveloppee()?.id === personne.id) {
            this.personneDeveloppee.set(null);
            this.detailDeveloppe.set(null);
          }
          this.charger();
        },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
      });
    });
  }

  // ---- Helpers d'affichage ----

  // Identifiant metier lisible construit a partir de l'UUID
  identifiantMetier(personne: PersonneResumeResponse): string {
    return personne.numeroPersonne;
  }

  estDeveloppee(personne: PersonneResumeResponse): boolean {
    return this.personneDeveloppee()?.id === personne.id;
  }

  libelleStatutAncrage(personne: PersonneResumeResponse): string {
    return personne.statutAncrage === 'REGISTRE_OFFICIEL'
      ? 'Registre officiel'
      : 'En instruction';
  }

  libelleTypePersonne(type: 'PHYSIQUE' | 'MORALE'): string {
    return type === 'PHYSIQUE' ? 'Personne physique' : 'Personne morale';
  }
}
