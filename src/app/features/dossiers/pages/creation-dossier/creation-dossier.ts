import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { LucideAngularModule, FolderOpen, User, Building2, Trash2, Upload, Pencil, LucideIconData } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { PersonneDetailService } from '../../../personnes/services/personne-detail.service';
import { PersonneService } from '../../../personnes/services/personne.service';
import { PersonnePhysiqueResponse, PersonneMoraleResponse } from '../../../personnes/models/personne.models';
import { DossierService } from '../../services/dossier.service';
import { DocumentService } from '../../../documents/services/document.service';
import { SourceSignalementService } from '../../../referentiels/services/source-signalement.service';
import { RoleImplicationService } from '../../../referentiels/services/role-implication.service';
import { TypeInfractionService } from '../../../referentiels/services/type-infraction.service';
import { ZoneGeographiqueService } from '../../../referentiels/services/zone-geographique.service';
import { TypeDocumentService } from '../../../referentiels/services/type-document.service';
import {
  SourceSignalementResponse, RoleImplicationResponse, TypeInfractionResponse,
  ZoneGeographiqueResponse, TypeDocumentResponse
} from '../../../referentiels/models/referentiel.models';
import { FaitReprocheRequest } from '../../models/dossier.models';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';
import { DatePipe } from '@angular/common';

interface OptionPersonne { id: string; nomAffichage: string; }
interface FichierEnAttente { fichier: File; typeDocumentId: string; }

@Component({
  selector: 'app-creation-dossier',
  standalone: true,
  imports: [DatePipe, 
    RouterLink, ReactiveFormsModule, CurrencyPipe,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatStepperModule, MatProgressSpinnerModule,
    LucideAngularModule, PageHeader
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './creation-dossier.html',
  styleUrl: './creation-dossier.scss'
})
export class CreationDossier {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly personneDetailService = inject(PersonneDetailService);
  private readonly personneService = inject(PersonneService);
  private readonly dossierService = inject(DossierService);
  private readonly documentService = inject(DocumentService);
  private readonly sourceService = inject(SourceSignalementService);
  private readonly roleService = inject(RoleImplicationService);
  private readonly typeInfractionService = inject(TypeInfractionService);
  private readonly zoneService = inject(ZoneGeographiqueService);
  private readonly typeDocumentService = inject(TypeDocumentService);

  readonly icons: Record<string, LucideIconData> = { FolderOpen, User, Building2, Trash2, Upload, Pencil };

  readonly personneId: string;
  readonly venantDeCreation: boolean;

  readonly chargementPersonne = signal(true);
  readonly enCours = signal(false);
  readonly resume = signal<{ id: string; nomAffichage: string; typePersonne: 'PHYSIQUE' | 'MORALE' } | null>(null);
  readonly detailPhysique = signal<PersonnePhysiqueResponse | null>(null);
  readonly detailMorale = signal<PersonneMoraleResponse | null>(null);

  readonly sources = signal<SourceSignalementResponse[]>([]);
  readonly roles = signal<RoleImplicationResponse[]>([]);
  readonly typesInfraction = signal<TypeInfractionResponse[]>([]);
  readonly zones = signal<ZoneGeographiqueResponse[]>([]);
  readonly typesDocument = signal<TypeDocumentResponse[]>([]);

  constructor() {
    this.personneId = this.route.snapshot.paramMap.get('personneId') ?? '';
    this.venantDeCreation = this.route.snapshot.queryParamMap.get('creation') === 'succes';

    if (!this.personneId) {
      this.router.navigate(['/personnes']);
      return;
    }

    this.personneDetailService.chargerToutesLesDonnees(this.personneId).subscribe({
      next: (d) => {
        this.resume.set({ id: d.resume.id, nomAffichage: d.resume.nomAffichage, typePersonne: d.resume.typePersonne });
        if (d.resume.typePersonne === 'PHYSIQUE') this.detailPhysique.set(d.detail as PersonnePhysiqueResponse);
        else this.detailMorale.set(d.detail as PersonneMoraleResponse);
        this.chargementPersonne.set(false);
      },
      error: () => {
        this.toastr.error('Personne introuvable');
        this.router.navigate(['/personnes']);
      }
    });

    this.sourceService.lister().subscribe({ next: (d) => this.sources.set(d), error: () => {} });
    this.roleService.lister().subscribe({ next: (d) => this.roles.set(d), error: () => {} });
    this.typeInfractionService.lister().subscribe({ next: (d) => this.typesInfraction.set(d), error: () => {} });
    this.zoneService.lister().subscribe({ next: (d) => this.zones.set(d), error: () => {} });
    this.typeDocumentService.lister().subscribe({ next: (d) => this.typesDocument.set(d), error: () => {} });
  }

  // ===== Etape 1 : Dossier =====
  readonly formDossier = this.fb.group({
    numeroDossier: [''],
    intitule: ['', Validators.required],
    dateOuverture: [new Date(), Validators.required],
    sourceSignalementId: ['', Validators.required],
    descriptionContexte: ['']
  });

  // ===== Etape 2 : Faits reproches (accumules) =====
  readonly formFaitCourant = this.fb.group({
    typeInfractionId: ['', Validators.required],
    zoneGeographiqueId: [''],
    dateFaits: [new Date(), Validators.required],
    lieuPrecis: [''],
    description: ['', Validators.required],
    montantPrejudice: [0, [Validators.required, Validators.min(0)]],
    devise: ['XOF', Validators.required]
  });
  readonly faitsAccumules = signal<FaitReprocheRequest[]>([]);

  ajouterFait(): void {
    if (this.formFaitCourant.invalid) return;
    const v = this.formFaitCourant.getRawValue();
    this.faitsAccumules.update((liste) => [...liste, {
      typeInfractionId: v.typeInfractionId!,
      zoneGeographiqueId: v.zoneGeographiqueId || undefined,
      dateFaits: (v.dateFaits as Date).toISOString().substring(0, 10),
      lieuPrecis: v.lieuPrecis || undefined,
      description: v.description!,
      montantPrejudice: v.montantPrejudice!,
      devise: v.devise!
    }]);
    const devise = v.devise;
    this.formFaitCourant.reset({ typeInfractionId: '', zoneGeographiqueId: '', dateFaits: new Date(), lieuPrecis: '', description: '', montantPrejudice: 0, devise });
  }
  retirerFait(i: number): void {
    this.faitsAccumules.update((liste) => liste.filter((_, idx) => idx !== i));
  }

  // ===== Etape 3 : Personnes impliquees (la premiere = personne d'origine, verrouillee) =====
  readonly lignesImplication = signal<FormGroup[]>([this.creerLigneImplication(true)]);
  readonly rechercheParLigne = new Map<FormGroup, FormControl<string | null>>();
  readonly optionsParLigne = signal<Map<FormGroup, OptionPersonne[]>>(new Map());
  private readonly rechercheSubject = new Subject<{ ligne: FormGroup; terme: string }>();

  private creerLigneImplication(verrouillee: boolean): FormGroup {
    const groupe = this.fb.group({
      personneId: [verrouillee ? this.personneId : '', Validators.required],
      roleImplicationId: ['', Validators.required],
      fonctionOccupee: [''],
      entiteLibelleALEpoque: [''],
      dateDebut: [new Date(), Validators.required],
      dateFin: [null as Date | null],
      observations: [''],
      verrouillee: [verrouillee]
    });
    this.rechercheParLigne.set(groupe, this.fb.control<string | null>(''));
    return groupe;
  }

  constructor_afterInit = (() => {
    this.rechercheSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.ligne === b.ligne && a.terme === b.terme),
      switchMap(({ ligne, terme }) =>
        terme.trim().length < 2
          ? []
          : this.personneService.rechercheAvancee({ page: 0, size: 10, nomOuDenomination: terme })
      )
    );
  })();

  ajouterLignePersonne(): void {
    this.lignesImplication.update((liste) => [...liste, this.creerLigneImplication(false)]);
  }
  retirerLignePersonne(index: number): void {
    if (index === 0) return;
    const groupe = this.lignesImplication()[index];
    this.rechercheParLigne.delete(groupe);
    this.lignesImplication.update((liste) => liste.filter((_, i) => i !== index));
  }

  rechercheControl(ligne: FormGroup): FormControl<string | null> {
    return this.rechercheParLigne.get(ligne)!;
  }

  chercherPersonne(ligne: FormGroup, terme: string): void {
    if (terme.trim().length < 2) {
      this.optionsParLigne.update((m) => { const c = new Map(m); c.set(ligne, []); return c; });
      return;
    }
    this.personneService.rechercheAvancee({ page: 0, size: 10, nomOuDenomination: terme }).subscribe((page) => {
      const options = page.content
        .filter((p) => p.id !== this.personneId)
        .map((p) => ({ id: p.id, nomAffichage: p.nomAffichage }));
      this.optionsParLigne.update((m) => { const c = new Map(m); c.set(ligne, options); return c; });
    });
  }

  optionsPour(ligne: FormGroup): OptionPersonne[] {
    return this.optionsParLigne().get(ligne) ?? [];
  }

  choisirPersonne(ligne: FormGroup, option: OptionPersonne): void {
    ligne.get('personneId')!.setValue(option.id);
    this.rechercheParLigne.get(ligne)!.setValue(option.nomAffichage);
  }

  libelleRole(id: string): string {
    return this.roles().find((r) => r.id === id)?.libelle ?? '';
  }

  get etapePersonnesValide(): boolean {
    return this.lignesImplication().every((l) => l.valid);
  }

  // ===== Etape 4 : Documents (mis en attente, envoyes a la validation finale) =====
  readonly formDocumentCourant = this.fb.group({
    typeDocumentId: ['', Validators.required]
  });
  readonly fichierSelectionne = signal<File | null>(null);
  readonly documentsEnAttente = signal<FichierEnAttente[]>([]);

  surSelectionFichier(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fichierSelectionne.set(input.files?.[0] ?? null);
  }

  ajouterDocumentEnAttente(): void {
    const fichier = this.fichierSelectionne();
    if (!fichier || this.formDocumentCourant.invalid) return;
    this.documentsEnAttente.update((liste) => [...liste, {
      fichier,
      typeDocumentId: this.formDocumentCourant.value.typeDocumentId!
    }]);
    this.fichierSelectionne.set(null);
    this.formDocumentCourant.reset({ typeDocumentId: '' });
  }

  retirerDocument(i: number): void {
    this.documentsEnAttente.update((liste) => liste.filter((_, idx) => idx !== i));
  }

  libelleTypeDocument(id: string): string {
    return this.typesDocument().find((t) => t.id === id)?.libelle ?? '';
  }

  // ===== Recapitulatif + soumission =====
  get formulaireValide(): boolean {
    return this.formDossier.valid && this.etapePersonnesValide;
  }

  async creerLeDossier(): Promise<void> {
    if (!this.formulaireValide) return;
    this.enCours.set(true);

    let dossierId: string;
    try {
      const v = this.formDossier.getRawValue();
      const dossier = await firstValueFrom(this.dossierService.creer({
        intitule: v.intitule!,
        sourceSignalementId: v.sourceSignalementId!,
        dateOuverture: (v.dateOuverture as Date).toISOString().substring(0, 10),
        numeroDossier: v.numeroDossier || undefined,
        descriptionContexte: v.descriptionContexte || undefined
      }));
      dossierId = dossier.id;
    } catch (erreur: unknown) {
      const err = erreur as HttpErrorResponse;
      this.toastr.error(err?.error?.message ?? err?.error?.detail ?? 'Échec de la création du dossier');
      this.enCours.set(false);
      return;
    }

    let personnesReussies = 0;
    for (const ligne of this.lignesImplication()) {
      const v = ligne.getRawValue();
      try {
        await firstValueFrom(this.dossierService.ajouterImplication(dossierId, {
          personneId: v.personneId!,
          roleImplicationId: v.roleImplicationId!,
          fonctionOccupee: v.fonctionOccupee || undefined,
          entiteLibelleALEpoque: v.entiteLibelleALEpoque || undefined,
          dateDebut: (v.dateDebut as Date).toISOString().substring(0, 10),
          dateFin: v.dateFin instanceof Date ? (v.dateFin as Date).toISOString().substring(0, 10) : undefined,
          observations: v.observations || undefined
        }));
        personnesReussies++;
      } catch {
        this.toastr.error(`Échec de l'implication pour une personne — à compléter depuis la fiche du dossier`);
      }
    }

    let faitsReussis = 0;
    for (const fait of this.faitsAccumules()) {
      try {
        await firstValueFrom(this.dossierService.ajouterFait(dossierId, fait));
        faitsReussis++;
      } catch {
        this.toastr.error(`Échec de l'enregistrement d'un fait — à compléter depuis la fiche du dossier`);
      }
    }

    let documentsReussis = 0;
    for (const doc of this.documentsEnAttente()) {
      try {
        await firstValueFrom(this.documentService.deposer(dossierId, doc.fichier, doc.typeDocumentId));
        documentsReussis++;
      } catch {
        this.toastr.error(`Échec du dépôt d'un document — à réessayer depuis la fiche du dossier`);
      }
    }

    this.toastr.success(
      `Dossier créé : ${personnesReussies} personne(s), ${faitsReussis} fait(s), ${documentsReussis} document(s) enregistrés`
    );
    this.enCours.set(false);
    this.router.navigate(['/dossiers', dossierId]);
  }
}
