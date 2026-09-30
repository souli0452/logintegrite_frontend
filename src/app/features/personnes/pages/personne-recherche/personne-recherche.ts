import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion'; // <-- AJOUT ICI
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Search, X, Eye, LucideIconData, FilterX } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PersonneService, PersonneSearchParams } from '../../services/personne.service';
import { PersonneResumeResponse } from '../../models/personne.models';
import { TypeInfractionService } from '../../../referentiels/services/type-infraction.service';
import { ZoneGeographiqueService } from '../../../referentiels/services/zone-geographique.service';
import { StatutJudiciaireService } from '../../../referentiels/services/statut-judiciaire.service';
import { EntiteOrganisationService } from '../../../referentiels/services/entite-organisation.service';
import {
  TypeInfractionResponse,
  ZoneGeographiqueResponse,
  StatutJudiciaireResponse,
  EntiteOrganisationResponse
} from '../../../referentiels/models/referentiel.models';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';
import { PaginatorFrancais } from '../../../../core/i18n/paginator-francais';

@Component({
  selector: 'app-personne-recherche',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatExpansionModule, // <-- AJOUT ICI
    MatButtonModule, MatCardModule, MatTableModule, MatPaginatorModule,
    MatTooltipModule, NomAccessibleInfobulle, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, EmptyState
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }, provideFrenchDateAdapter()],
  templateUrl: './personne-recherche.html',
  styleUrl: './personne-recherche.scss'
})
export class PersonneRecherche {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly personneService = inject(PersonneService);
  private readonly typeInfractionService = inject(TypeInfractionService);
  private readonly zoneService = inject(ZoneGeographiqueService);
  private readonly statutJudiciaireService = inject(StatutJudiciaireService);
  private readonly entiteService = inject(EntiteOrganisationService);

  readonly icons: Record<string, LucideIconData> = { Search, X, Eye, FilterX };

  readonly typesInfraction = signal<TypeInfractionResponse[]>([]);
  readonly zones = signal<ZoneGeographiqueResponse[]>([]);
  readonly statutsJudiciaires = signal<StatutJudiciaireResponse[]>([]);
  readonly entites = signal<EntiteOrganisationResponse[]>([]);

  readonly resultats = signal<PersonneResumeResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(20);
  readonly chargement = signal(false);
  readonly rechercheEffectuee = signal(false);
  readonly colonnesAffichees = ['identifiant', 'nomAffichage', 'type', 'actions'];

  readonly formulaire = this.fb.group({
    nomOuDenomination: [''],
    typePersonne: [''],
    nationalite: [''],
    numeroPieceIdentite: [''],
    rccm: [''],
    ifu: [''],
    typeInfractionId: [''],
    zoneGeographiqueId: [''],
    statutJudiciaireId: [''],
    entiteOrganisationId: [''],
    fonction: [''],
    periodeDebut: [null as Date | null],
    periodeFin: [null as Date | null]
  });

  constructor() {
    // Terme transmis par la barre de recherche du haut : pre-remplit le formulaire et lance la recherche.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const terme = params.get('q')?.trim();
      if (terme) {
        this.formulaire.patchValue({ nomOuDenomination: terme });
        this.rechercher();
      }
    });
    this.typeInfractionService.lister().subscribe({ next: (d) => this.typesInfraction.set(d), error: () => {} });
    this.zoneService.lister().subscribe({ next: (d) => this.zones.set(d), error: () => {} });
    this.statutJudiciaireService.lister().subscribe({ next: (d) => this.statutsJudiciaires.set(d), error: () => {} });
    this.entiteService.lister().subscribe({ next: (d) => this.entites.set(d), error: () => {} });
  }

  rechercher(page = 0): void {
    const v = this.formulaire.getRawValue();

    const criteres: PersonneSearchParams = {
      page,
      size: this.taillePage(),
      nomOuDenomination: v.nomOuDenomination || undefined,
      typePersonne: (v.typePersonne as 'PHYSIQUE' | 'MORALE') || undefined,
      nationalite: v.nationalite || undefined,
      numeroPieceIdentite: v.numeroPieceIdentite || undefined,
      rccm: v.rccm || undefined,
      ifu: v.ifu || undefined,
      typeInfractionId: v.typeInfractionId || undefined,
      zoneGeographiqueId: v.zoneGeographiqueId || undefined,
      statutJudiciaireId: v.statutJudiciaireId || undefined,
      entiteOrganisationId: v.entiteOrganisationId || undefined,
      fonction: v.fonction || undefined,
      periodeDebut: this.formaterDate(v.periodeDebut),
      periodeFin: this.formaterDate(v.periodeFin)
    };

    this.chargement.set(true);
    this.rechercheEffectuee.set(true);
    this.personneService.rechercheAvancee(criteres).subscribe({
      next: (result) => {
        this.resultats.set(result.content);
        this.totalElements.set(result.totalElements);
        this.pageCourante.set(page);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Recherche impossible');
        this.chargement.set(false);
      }
    });
  }

  reinitialiser(): void {
    this.formulaire.reset({
      nomOuDenomination: '', typePersonne: '', nationalite: '',
      numeroPieceIdentite: '', rccm: '', ifu: '',
      typeInfractionId: '', zoneGeographiqueId: '', statutJudiciaireId: '',
      entiteOrganisationId: '', fonction: '',
      periodeDebut: null, periodeFin: null
    });
    this.resultats.set([]);
    this.totalElements.set(0);
    this.rechercheEffectuee.set(false);
  }

  changerPage(event: PageEvent): void {
    this.taillePage.set(event.pageSize);
    this.rechercher(event.pageIndex);
  }

  voir(personne: PersonneResumeResponse): void {
    this.router.navigate(['/personnes', personne.id]);
  }

  identifiantMetier(p: PersonneResumeResponse): string {
    return p.numeroPersonne;
  }

  private formaterDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().substring(0, 10);
  }
}
