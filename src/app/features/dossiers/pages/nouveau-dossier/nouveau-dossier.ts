import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule,
  ArrowLeft, ArrowRight, Check, Plus, Trash2,
  FolderOpen, User, Building2, Save,
  LucideIconData
} from 'lucide-angular';

import { PersonneDetailService, PersonneDetailComplet } from '../../../personnes/services/personne-detail.service';
import { PersonnePhysiqueResponse, PersonneMoraleResponse } from '../../../personnes/models/personne.models';
import { DossierWorkflowService, AjouterDossierPersonneRequest } from '../../services/dossier-workflow.service';
import { SourceSignalementService } from '../../../referentiels/services/source-signalement.service';
import { RoleImplicationService } from '../../../referentiels/services/role-implication.service';
import { StatutJudiciaireService } from '../../../referentiels/services/statut-judiciaire.service';
import { EntiteOrganisationService } from '../../../referentiels/services/entite-organisation.service';
import { TypeInfractionService } from '../../../referentiels/services/type-infraction.service';
import { ZoneGeographiqueService } from '../../../referentiels/services/zone-geographique.service';
import {
  SourceSignalementResponse, RoleImplicationResponse,
  StatutJudiciaireResponse, EntiteOrganisationResponse,
  TypeInfractionResponse, ZoneGeographiqueResponse
} from '../../../referentiels/models/referentiel.models';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';

interface FaitLocal {
  typeInfractionId: string;
  typeInfractionLibelle: string;
  zoneGeographiqueId?: string;
  zoneGeographiqueLibelle?: string;
  description: string;
  montantPrejudice: number;
  devise: string;
  dateFaits: string;
}

@Component({
  selector: 'app-nouveau-dossier',
  standalone: true,
  imports: [
    ReactiveFormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatProgressSpinnerModule,
    LucideAngularModule
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './nouveau-dossier.html',
  styleUrl: './nouveau-dossier.scss'
})
export class NouveauDossier implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly personneDetailService = inject(PersonneDetailService);
  private readonly workflowService = inject(DossierWorkflowService);
  private readonly sourceService = inject(SourceSignalementService);
  private readonly roleService = inject(RoleImplicationService);
  private readonly statutJudiciaireService = inject(StatutJudiciaireService);
  private readonly entiteService = inject(EntiteOrganisationService);
  private readonly typeInfractionService = inject(TypeInfractionService);
  private readonly zoneService = inject(ZoneGeographiqueService);

  readonly icons: Record<string, LucideIconData> = {
    ArrowLeft, ArrowRight, Check, Plus, Trash2, FolderOpen, User, Building2, Save
  };

  // Etat
  readonly personneId = signal<string | null>(null);
  readonly donnees = signal<PersonneDetailComplet | null>(null);
  readonly chargementPersonne = signal(true);
  readonly etapeActive = signal(0);
  readonly soumission = signal(false);

  // Referentiels
  readonly sources = signal<SourceSignalementResponse[]>([]);
  readonly roles = signal<RoleImplicationResponse[]>([]);
  readonly statutsJudiciaires = signal<StatutJudiciaireResponse[]>([]);
  readonly entites = signal<EntiteOrganisationResponse[]>([]);
  readonly typesInfraction = signal<TypeInfractionResponse[]>([]);
  readonly zones = signal<ZoneGeographiqueResponse[]>([]);

  // Faits ajoutes dynamiquement
  readonly faitsLocaux = signal<FaitLocal[]>([]);

  // Computed
  readonly detailPhysique = computed(() => {
    const d = this.donnees();
    if (!d || d.resume.typePersonne !== 'PHYSIQUE') return null;
    return d.detail as PersonnePhysiqueResponse;
  });

  readonly detailMorale = computed(() => {
    const d = this.donnees();
    if (!d || d.resume.typePersonne !== 'MORALE') return null;
    return d.detail as PersonneMoraleResponse;
  });

  readonly identifiantMetier = computed(() => {
    const d = this.donnees();
    if (!d) return '-';
    return d.resume.numeroPersonne;
  });

  readonly etapes = ['Dossier', 'Implication', 'Faits reproches', 'Recapitulatif'];

  // Formulaire etape 1 : informations du dossier
  readonly formDossier = this.fb.group({
    intitule: ['', [Validators.required, Validators.maxLength(255)]],
    descriptionContexte: ['', Validators.maxLength(5000)],  // large mais pas illimité
    sourceSignalementId: ['', Validators.required]
});

  // Formulaire etape 2 : implication
  readonly formImplication = this.fb.group({
    roleImplicationId: ['', Validators.required],
    entiteOrganisationId: [''],
    fonctionOccupee: [''],
    statutJudiciaireId: [''],
    autoriteCompetente: [''],
    referenceAffaire: ['']
  });

  // Formulaire ajout d'un fait (reinitialise apres chaque ajout)
  readonly formFait = this.fb.group({
    typeInfractionId: ['', Validators.required],
    zoneGeographiqueId: [''],
    description: ['', Validators.required],
    montantPrejudice: [null as number | null, Validators.required],
    devise: ['XOF'],
    dateFaits: [null as Date | null, Validators.required]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('personneId');
    if (!id) { this.router.navigate(['/personnes']); return; }
    this.personneId.set(id);

    // Charger les donnees de la personne pour le recap
    this.personneDetailService.chargerToutesLesDonnees(id).subscribe({
      next: (d: PersonneDetailComplet) => { this.donnees.set(d); this.chargementPersonne.set(false); },
      error: () => { this.toastr.error('Impossible de charger la personne'); this.chargementPersonne.set(false); }
    });

    // Referentiels en parallele
    this.sourceService.lister().subscribe({ next: (d: SourceSignalementResponse[]) => this.sources.set(d), error: () => {} });
    this.roleService.lister().subscribe({ next: (d: RoleImplicationResponse[]) => this.roles.set(d), error: () => {} });
    this.statutJudiciaireService.lister().subscribe({ next: (d: StatutJudiciaireResponse[]) => this.statutsJudiciaires.set(d), error: () => {} });
    this.entiteService.lister().subscribe({ next: (d: EntiteOrganisationResponse[]) => this.entites.set(d), error: () => {} });
    this.typeInfractionService.lister().subscribe({ next: (d: TypeInfractionResponse[]) => this.typesInfraction.set(d), error: () => {} });
    this.zoneService.lister().subscribe({ next: (d: ZoneGeographiqueResponse[]) => this.zones.set(d), error: () => {} });
  }

  // Navigation entre etapes
  etapeSuivante(): void {
    if (this.etapeActive() === 0 && this.formDossier.invalid) {
      this.formDossier.markAllAsTouched();
      return;
    }
    if (this.etapeActive() === 1 && this.formImplication.invalid) {
      this.formImplication.markAllAsTouched();
      return;
    }
    if (this.etapeActive() === 2 && this.faitsLocaux().length === 0) {
      this.toastr.warning('Ajoutez au moins un fait reproché');
      return;
    }
    this.etapeActive.update((e) => Math.min(e + 1, this.etapes.length - 1));
  }

  etapePrecedente(): void {
    this.etapeActive.update((e) => Math.max(e - 1, 0));
  }

  allerEtape(index: number): void {
    // Autoriser seulement les etapes deja visitees ou la suivante
    if (index <= this.etapeActive()) this.etapeActive.set(index);
  }

  // Gestion des faits
  ajouterFait(): void {
    if (this.formFait.invalid) {
      this.formFait.markAllAsTouched();
      return;
    }
    const v = this.formFait.getRawValue();
    const type = this.typesInfraction().find((t) => t.id === v.typeInfractionId);
    const zone = v.zoneGeographiqueId ? this.zones().find((z) => z.id === v.zoneGeographiqueId) : undefined;

    this.faitsLocaux.update((liste) => [...liste, {
      typeInfractionId: v.typeInfractionId!,
      typeInfractionLibelle: type?.libelle ?? '-',
      zoneGeographiqueId: v.zoneGeographiqueId || undefined,
      zoneGeographiqueLibelle: zone?.libelle,
      description: v.description!,
      montantPrejudice: v.montantPrejudice!,
      devise: v.devise ?? 'XOF',
      dateFaits: v.dateFaits instanceof Date
        ? v.dateFaits.toISOString().substring(0, 10)
        : ''
    }]);

    this.formFait.reset({ devise: 'XOF' });
  }

  supprimerFait(index: number): void {
    this.faitsLocaux.update((liste) => liste.filter((_, i) => i !== index));
  }

  // Soumission finale
  soumettre(): void {
    const id = this.personneId();
    if (!id) return;

    this.soumission.set(true);
    const d = this.formDossier.getRawValue();
    const imp = this.formImplication.getRawValue();

    const request: AjouterDossierPersonneRequest = {
      dossier: {
        intitule: d.intitule!,
        descriptionContexte: d.descriptionContexte || undefined,
        sourceSignalementId: d.sourceSignalementId!
      },
      roleImplicationId: imp.roleImplicationId!,
      entiteOrganisationId: imp.entiteOrganisationId || undefined,
      fonctionOccupee: imp.fonctionOccupee || undefined,
      statutJudiciaireId: imp.statutJudiciaireId || undefined,
      autoriteCompetente: imp.autoriteCompetente || undefined,
      referenceAffaire: imp.referenceAffaire || undefined,
      faits: this.faitsLocaux().map((f) => ({
        typeInfractionId: f.typeInfractionId,
        zoneGeographiqueId: f.zoneGeographiqueId,
        description: f.description,
        montantPrejudice: f.montantPrejudice,
        devise: f.devise,
        dateFaits: f.dateFaits
      }))
    };

    this.workflowService.ajouterDossierAPersonne(id, request).subscribe({
      next: () => {
        this.toastr.success('Dossier créé et enregistré avec succès');
        this.router.navigate(['/personnes', id]);
      },
      error: (err) => {
  let msg = '';
  if (err?.status === 409) {
    msg = 'Un dossier avec ce numéro existe déjà. Laissez le champ "Numéro de dossier" vide pour laisser le système le générer, ou choisissez un autre numéro.';
  } else if (err?.status === 400) {
    msg = err?.error?.errors?.[0]?.defaultMessage ?? err?.error?.message ?? 'Données invalides';
  } else if (err?.status === 403) {
    msg = 'Vous n\'avez pas les droits pour créer un dossier';
  } else {
    msg = err?.error?.message ?? err?.error?.detail ?? 'Échec de la création du dossier';
  }
  this.toastr.error(msg);
  this.soumission.set(false);
}
    });
  }

  retour(): void {
    const id = this.personneId();
    if (id) this.router.navigate(['/personnes', id]);
    else this.router.navigate(['/personnes']);
  }

  // Libelles utilitaires
  libelleRole(id: string): string {
    return this.roles().find((r) => r.id === id)?.libelle ?? '-';
  }

  libelleSource(id: string): string {
    return this.sources().find((s) => s.id === id)?.libelle ?? '-';
  }

  libelleStatut(id: string | null): string {
    if (!id) return '-';
    return this.statutsJudiciaires().find((s) => s.id === id)?.libelle ?? '-';
  }

  libelleEntite(id: string | null): string {
    if (!id) return '-';
    return this.entites().find((e) => e.id === id)?.libelle ?? '-';
  }
}
