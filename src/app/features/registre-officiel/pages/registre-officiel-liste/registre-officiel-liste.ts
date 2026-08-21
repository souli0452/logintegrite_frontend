import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule, Shield, ShieldCheck, User, Building2, Users,
  Search, Eye, Calendar, FileWarning, Clock, SlidersHorizontal, X,
  LucideIconData
} from 'lucide-angular';

import { PersonneService, PersonneSearchParams } from '../../../personnes/services/personne.service';
import { PersonneResumeResponse } from '../../../personnes/models/personne.models';
import { TypeInfractionService } from '../../../referentiels/services/type-infraction.service';
import { ZoneGeographiqueService } from '../../../referentiels/services/zone-geographique.service';
import { StatutJudiciaireService } from '../../../referentiels/services/statut-judiciaire.service';
import { EntiteOrganisationService } from '../../../referentiels/services/entite-organisation.service';
import {
  TypeInfractionResponse, ZoneGeographiqueResponse,
  StatutJudiciaireResponse, EntiteOrganisationResponse
} from '../../../referentiels/models/referentiel.models';

type FiltreType = 'TOUS' | 'PHYSIQUE' | 'MORALE';
type TriOrdre = 'RECENT' | 'ANCIEN' | 'PLUS_DE_DOSSIERS';

@Component({
  selector: 'app-registre-officiel-liste',
  standalone: true,
  imports: [
    DatePipe, ReactiveFormsModule,
    MatPaginatorModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatExpansionModule,
    LucideAngularModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './registre-officiel-liste.html',
  styleUrl: './registre-officiel-liste.scss'
})
export class RegistreOfficielListe implements OnDestroy {
  private readonly router = inject(Router);
  private readonly service = inject(PersonneService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private readonly typeInfractionService = inject(TypeInfractionService);
  private readonly zoneService = inject(ZoneGeographiqueService);
  private readonly statutJudiciaireService = inject(StatutJudiciaireService);
  private readonly entiteService = inject(EntiteOrganisationService);

  readonly icons: Record<string, LucideIconData> = {
    Shield, ShieldCheck, User, Building2, Users, Search, Eye,
    Calendar, FileWarning, Clock, SlidersHorizontal, X
  };

  // --- État liste ---
  readonly personnes = signal<PersonneResumeResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageCourante = signal(0);
  readonly taillePage = signal(12);
  readonly chargement = signal(true);

  // --- Filtres rapides ---
  readonly filtreType = signal<FiltreType>('TOUS');
  readonly ordreTri = signal<TriOrdre>('RECENT');

  // --- Drawer ---
  readonly drawerOuvert = signal(false);

  // --- Référentiels pour les mat-select du drawer ---
  readonly typesInfraction = signal<TypeInfractionResponse[]>([]);
  readonly zones = signal<ZoneGeographiqueResponse[]>([]);
  readonly statutsJudiciaires = signal<StatutJudiciaireResponse[]>([]);
  readonly entites = signal<EntiteOrganisationResponse[]>([]);

  // --- Formulaire recherche avancée (12 critères) ---
  readonly formulaireFiltres = this.fb.group({
    nomOuDenomination: [''],
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

  // ---SOURCE DE VÉRITÉ : ce qui est réellement envoyé au backend ---
  private readonly criteresAppliques = signal<Partial<PersonneSearchParams>>({});

  readonly dateAujourdhui = new Date();

  // --- Badge sur le bouton "Recherche avancée" ---
  readonly nbFiltresActifs = computed(() => {
    const c = this.criteresAppliques();
    return Object.values(c).filter(v => v !== undefined && v !== null && v !== '').length;
  });

  // --- Tri client ---
  readonly personnesTriees = computed<PersonneResumeResponse[]>(() => {
    const tri = this.ordreTri();
    const liste = [...this.personnes()];
    liste.sort((a, b) => {
      if (tri === 'PLUS_DE_DOSSIERS') {
        return b.nombreDossiersValides - a.nombreDossiersValides;
      }
      const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0;
      const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0;
      return tri === 'RECENT' ? dateB - dateA : dateA - dateB;
    });
    return liste;
  });

  private readonly subs: Subscription[] = [];

  constructor() {
    // Chargement des référentiels une fois
    this.subs.push(
      this.typeInfractionService.lister().subscribe({ next: d => this.typesInfraction.set(d), error: () => {} }),
      this.zoneService.lister().subscribe({ next: d => this.zones.set(d), error: () => {} }),
      this.statutJudiciaireService.lister().subscribe({ next: d => this.statutsJudiciaires.set(d), error: () => {} }),
      this.entiteService.lister().subscribe({ next: d => this.entites.set(d), error: () => {} })
    );
    this.charger();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // FIX PRINCIPAL — on spread TOUS les critères appliqués dans la requête
  charger(): void {
    this.chargement.set(true);
    const type = this.filtreType();

    const criteres: PersonneSearchParams = {
      ...this.criteresAppliques(),   //nationalite, rccm, ifu, typeInfraction, zone, statut, entite, fonction, periodes
      page: this.pageCourante(),
      size: this.taillePage(),
      typePersonne: type === 'TOUS' ? undefined : type,
      statutAncrage: 'REGISTRE_OFFICIEL'
    };

    this.service.rechercheAvancee(criteres).subscribe({
      next: (page) => {
        this.personnes.set(page.content);
        this.totalElements.set(page.totalElements);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger le registre');
        this.chargement.set(false);
      }
    });
  }

  // ===== Drawer =====
  ouvrirDrawer(): void { this.drawerOuvert.set(true); }
  fermerDrawer(): void { this.drawerOuvert.set(false); }

  // FIX PRINCIPAL — on prend TOUTES les valeurs du form et on met à jour la source de vérité
  appliquerFiltres(): void {
    const v = this.formulaireFiltres.getRawValue();
    this.criteresAppliques.set({
      nomOuDenomination:      v.nomOuDenomination || undefined,
      nationalite:            v.nationalite || undefined,
      numeroPieceIdentite:    v.numeroPieceIdentite || undefined,
      rccm:                   v.rccm || undefined,
      ifu:                    v.ifu || undefined,
      typeInfractionId:       v.typeInfractionId || undefined,
      zoneGeographiqueId:     v.zoneGeographiqueId || undefined,
      statutJudiciaireId:     v.statutJudiciaireId || undefined,
      entiteOrganisationId:   v.entiteOrganisationId || undefined,
      fonction:               v.fonction || undefined,
      periodeDebut:           this.formaterDate(v.periodeDebut),
      periodeFin:             this.formaterDate(v.periodeFin)
    });
    this.pageCourante.set(0);
    this.fermerDrawer();
    this.charger();
  }

  reinitialiserFiltres(): void {
    this.formulaireFiltres.reset({
      nomOuDenomination: '', nationalite: '',
      numeroPieceIdentite: '', rccm: '', ifu: '',
      typeInfractionId: '', zoneGeographiqueId: '', statutJudiciaireId: '',
      entiteOrganisationId: '', fonction: '',
      periodeDebut: null, periodeFin: null
    });
    this.criteresAppliques.set({});
    this.pageCourante.set(0);
    this.charger();
  }

  reinitialiserTout(): void {
    this.filtreType.set('TOUS');
    this.reinitialiserFiltres();
  }

  changerPage(event: PageEvent): void {
    this.pageCourante.set(event.pageIndex);
    this.taillePage.set(event.pageSize);
    this.charger();
  }

  changerFiltreType(type: FiltreType): void {
    this.filtreType.set(type);
    this.pageCourante.set(0);
    this.charger();
  }

  changerTri(valeur: TriOrdre): void {
    this.ordreTri.set(valeur);
  }

  consulter(personne: PersonneResumeResponse): void {
    this.router.navigate(['/personnes', personne.id]);
  }

  identifiantMetier(p: PersonneResumeResponse): string {
    const prefix = p.typePersonne === 'PHYSIQUE' ? 'PERS' : 'ORG';
    return `${prefix}-${p.id.substring(0, 6).toUpperCase()}`;
  }

  libelleType(type: 'PHYSIQUE' | 'MORALE'): string {
    return type === 'PHYSIQUE' ? 'Personne physique' : 'Personne morale';
  }

  private formaterDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().substring(0, 10);
  }
}
