import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, catchError, map } from 'rxjs';
import {
  LucideAngularModule, UserPlus, X, Save, Search, User, Building2,
  Briefcase, Calendar, Scale, AlertCircle, Plus, Check,
  LucideIconData
} from 'lucide-angular';

import { DossierService } from '../../../services/dossier.service';
import { ImplicationRequest } from '../../../models/dossier.models';
import { PersonneService } from '../../../../personnes/services/personne.service';
import { PersonnePhysiqueService } from '../../../../personnes/services/personne-physique.service';
import { PersonneMoraleService } from '../../../../personnes/services/personne-morale.service';
import {
  PersonneResumeResponse,
  PersonnePhysiqueRequest, PersonneMoraleRequest
} from '../../../../personnes/models/personne.models';
import { RoleImplicationService } from '../../../../referentiels/services/role-implication.service';
import { EntiteOrganisationService } from '../../../../referentiels/services/entite-organisation.service';
import {
  RoleImplicationResponse,
  EntiteOrganisationResponse
} from '../../../../referentiels/models/referentiel.models';

// 🆕 Étape 1 : Imports du service et modèle de Nationalité
import { NationaliteService } from '../../../../referentiels/services/nationalite.service';
import { NationaliteResponse } from '../../../../referentiels/models/referentiel.models';
import { ChampNip } from '../../../../personnes/composants/champ-nip/champ-nip';


export interface DonneesDialogAjoutPersonne {
  dossierId: string;
  numeroDossier?: string;
  dossierIntitule?: string;
  personnesDejaImpliqueesIds: string[];
}

type ModePersonne = 'rechercher' | 'creer';
type TypePersonneCreation = 'PHYSIQUE' | 'MORALE';

@Component({
  selector: 'app-ajouter-personne-dossier-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatAutocompleteModule,
    MatProgressSpinnerModule,ChampNip,
    LucideAngularModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ajouter-personne-dossier-dialog.html',
  styleUrl: './ajouter-personne-dossier-dialog.scss'
})
export class AjouterPersonneDossierDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AjouterPersonneDossierDialog, boolean>);
  readonly data = inject<DonneesDialogAjoutPersonne>(MAT_DIALOG_DATA);
  private readonly dossierService = inject(DossierService);
  private readonly personneService = inject(PersonneService);
  private readonly personnePhysiqueService = inject(PersonnePhysiqueService);
  private readonly personneMoraleService = inject(PersonneMoraleService);
  private readonly roleService = inject(RoleImplicationService);
  private readonly entiteService = inject(EntiteOrganisationService);
  private readonly toastr = inject(ToastrService);

  // 🆕 Étape 2 : Injection du service et création des signals pour les nationalités
  private readonly nationaliteService = inject(NationaliteService);
  readonly nationalites = signal<NationaliteResponse[]>([]);
  readonly chargementNationalites = signal(false);

  readonly icons: Record<string, LucideIconData> = {
    UserPlus, X, Save, Search, User, Building2, Briefcase, Calendar, Scale,
    AlertCircle, Plus, Check
  };

  // ═══════ État général ═══════
  readonly mode = signal<ModePersonne>('rechercher');
  readonly typePersonneCreation = signal<TypePersonneCreation>('PHYSIQUE');
  readonly personneSelectionnee = signal<PersonneResumeResponse | null>(null);
  readonly roles = signal<RoleImplicationResponse[]>([]);
  readonly chargementRoles = signal(false);
  readonly entitesFiltrees = signal<EntiteOrganisationResponse[]>([]);
  readonly enregistrement = signal(false);
  readonly creationEnCours = signal(false);

  // ═══════ Contrôles d'autocomplete ═══════
  readonly rechercheCtrl = new FormControl<string>('', { nonNullable: true });
  readonly entiteCtrl = new FormControl<string>('', { nonNullable: true });

  personnesTrouvees$!: Observable<PersonneResumeResponse[]>;

  // ═══════ Formulaire création — Personne PHYSIQUE ═══════
  readonly formPhysique = this.fb.group({
    nomNaissance: ['', Validators.required],
    nomUsage: [''],
    prenoms: ['', Validators.required],
    nip: [''],
    sexe: ['M' as 'M' | 'F', Validators.required],
    dateNaissance: [null as Date | null],
    lieuNaissance: [''],
    nationaliteId: ['', Validators.required], // 🆕 Étape 3 : Remplacement de nationalite par nationaliteId
    situationMatrimoniale: ['' as '' | 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF'],
    nomConjoint: [{ value: '', disabled: true }],
    profession: [''],
    matriculeFonctionPublique: [''],
    gradeCategorie: [''],
    adresse: [''],
    telephone: ['']
  });

  readonly estMarie = computed(() =>
    this.formPhysique.controls.situationMatrimoniale.value === 'MARIE'
  );

  // ═══════ Formulaire création — Personne MORALE ═══════
  readonly formMorale = this.fb.group({
    denominationSociale: ['', Validators.required],
    sigle: [''],
    formeJuridique: ['', Validators.required],
    rccm: [''],
    ifu: [''],
    secteurActivite: ['', Validators.required],
    siegeSocial: ['', Validators.required],
    capitalSocial: [null as number | null],
    dateCreationEntreprise: [null as Date | null],
    telephone: [''],
    email: ['', Validators.email]
  });

  // ═══════ Formulaire implication (section 2) ═══════
  readonly form = this.fb.group({
    roleImplicationId: ['', Validators.required],
    entiteOrganisationId: [null as string | null],
    entiteLibelleALEpoque: [''],
    fonctionOccupee: [''],
    dateDebut: [new Date(), Validators.required],
    dateFin: [null as Date | null],
    observations: ['']
  });

  ngOnInit(): void {
    this.chargerRoles();
    this.configurerRecherchePersonne();
    this.configurerAutocompleteEntite();
    this.configurerActivationConjoint();
    this.chargerNationalites(); // 🆕 Étape 4 : Chargement au montage
  }

  // ─── Chargement des nationalités ──────────────────────────────────────────
  // 🆕 Étape 4 : Implémentation du chargement des nationalités
  private chargerNationalites(): void {
    this.chargementNationalites.set(true);
    this.nationaliteService.listerActifs().subscribe({
      next: (liste) => {
        this.nationalites.set(liste);
        const burkinabe = liste.find(n => n.libelle === 'Burkinabè');
        if (burkinabe) {
          this.formPhysique.patchValue({ nationaliteId: burkinabe.id });
        }
        this.chargementNationalites.set(false);
      },
      error: () => this.chargementNationalites.set(false)
    });
  }

  // ─── Chargement des rôles ─────────────────────────────────────────────────
  private chargerRoles(): void {
    this.chargementRoles.set(true);
    this.roleService.lister().subscribe({
      next: (liste) => {
        this.roles.set(liste.filter((r: any) => r.actif !== false));
        this.chargementRoles.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les rôles');
        this.chargementRoles.set(false);
      }
    });
  }

  // ─── Bascule mode Recherche / Création ────────────────────────────────────
  changerMode(nouveauMode: ModePersonne): void {
    this.mode.set(nouveauMode);
    if (nouveauMode === 'creer' && this.personneSelectionnee()) {
      this.personneSelectionnee.set(null);
    }
    if (nouveauMode === 'rechercher') {
      this.rechercheCtrl.setValue('');
    }
  }

  changerTypeCreation(type: TypePersonneCreation): void {
    this.typePersonneCreation.set(type);
  }

  // ─── Activation dynamique du champ Nom du conjoint ────────────────────────
  private configurerActivationConjoint(): void {
    this.formPhysique.controls.situationMatrimoniale.valueChanges.subscribe((v) => {
      const nomConjoint = this.formPhysique.controls.nomConjoint;
      if (v === 'MARIE') {
        nomConjoint.enable();
      } else {
        nomConjoint.disable();
        nomConjoint.setValue('');
      }
    });
  }

  // ─── Autocomplete personnes ───────────────────────────────────────────────
  private configurerRecherchePersonne(): void {
    this.personnesTrouvees$ = this.rechercheCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((terme) => {
        const nom = (terme ?? '').toString().trim();
        if (nom.length < 2) return of([] as PersonneResumeResponse[]);
        return this.personneService.rechercheAvancee({
          page: 0,
          size: 10,
          nomOuDenomination: nom
        }).pipe(
          map(page => page.content),
          catchError(() => of([] as PersonneResumeResponse[]))
        );
      })
    );
  }

  personneDejaImpliquee(personneId: string): boolean {
    return this.data.personnesDejaImpliqueesIds.includes(personneId);
  }

  afficherPersonne = (personne: PersonneResumeResponse | null | string): string => {
    if (!personne || typeof personne === 'string') return '';
    return personne.nomAffichage;
  };

  onPersonneSelectionnee(event: MatAutocompleteSelectedEvent): void {
    const personne = event.option.value as PersonneResumeResponse;
    if (this.personneDejaImpliquee(personne.id)) {
      this.toastr.warning('Cette personne est déjà impliquée dans ce dossier');
      this.rechercheCtrl.setValue('');
      return;
    }
    this.personneSelectionnee.set(personne);
    this.rechercheCtrl.setValue(personne.nomAffichage);
  }

  changerPersonne(): void {
    this.personneSelectionnee.set(null);
    this.rechercheCtrl.setValue('');
    this.mode.set('rechercher');
  }

  // ─── Autocomplete entité ──────────────────────────────────────────────────
  private configurerAutocompleteEntite(): void {
    this.entiteCtrl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe((terme) => {
      if (!terme || terme.length < 2) {
        this.entitesFiltrees.set([]);
        return;
      }
      this.entiteService.lister().subscribe({
        next: (liste: any) => {
          const filtre = liste.filter((e: any) =>
            e.libelle.toLowerCase().includes(terme.toLowerCase())
          );
          this.entitesFiltrees.set(filtre.slice(0, 8));
        },
        error: () => this.entitesFiltrees.set([])
      });
    });
  }

  onEntiteSelectionnee(event: MatAutocompleteSelectedEvent): void {
    const entite = event.option.value as EntiteOrganisationResponse;
    this.form.patchValue({
      entiteOrganisationId: entite.id,
      entiteLibelleALEpoque: entite.libelle
    });
    this.entiteCtrl.setValue(entite.libelle);
  }

  afficherEntite = (entite: EntiteOrganisationResponse | null | string): string => {
    if (!entite) return '';
    if (typeof entite === 'string') return entite;
    return entite.libelle;
  };

  // ─── Création à la volée : personne physique ──────────────────────────────
  creerPersonnePhysique(): void {
    if (this.formPhysique.invalid) {
      this.formPhysique.markAllAsTouched();
      this.toastr.warning('Complétez les champs obligatoires de la personne');
      return;
    }

    const v = this.formPhysique.getRawValue();
    const request: PersonnePhysiqueRequest = {
      nomNaissance: v.nomNaissance!,
      nomUsage: v.nomUsage || undefined,
      prenoms: v.prenoms!,
      nip: v.nip || undefined,
      sexe: v.sexe!,
      dateNaissance: v.dateNaissance ? this.toIsoDate(v.dateNaissance) : undefined,
      lieuNaissance: v.lieuNaissance || undefined,
      nationaliteId: v.nationaliteId!, // 🆕 Étape 5 : Remplacement par nationaliteId
      situationMatrimoniale: (v.situationMatrimoniale || undefined) as PersonnePhysiqueRequest['situationMatrimoniale'],
      nomConjoint: v.nomConjoint || undefined,
      profession: v.profession || undefined,
      matriculeFonctionPublique: v.matriculeFonctionPublique || undefined,
      gradeCategorie: v.gradeCategorie || undefined,
      adresse: v.adresse || undefined,
      telephone: v.telephone || undefined
    } as PersonnePhysiqueRequest;

    this.creationEnCours.set(true);
    this.personnePhysiqueService.creer(request).subscribe({
      next: (created: any) => {
        const resume: PersonneResumeResponse = {
          id: created.id,
          typePersonne: 'PHYSIQUE',
          nomAffichage: created.nomAffichage || `${v.nomNaissance} ${v.prenoms}`,
          statutAncrage: 'EN_INSTRUCTION',
          nombreDossiersValides: 0,
          dateCreation: created.dateCreation || new Date().toISOString()
        };
        this.personneSelectionnee.set(resume);
        this.mode.set('rechercher');
        this.creationEnCours.set(false);
        this.toastr.success('Personne créée et sélectionnée');

        // Réinitialisation du formulaire en conservant la nationalité Burkinabè par défaut
        const burkinabe = this.nationalites().find(n => n.libelle === 'Burkinabè');
        this.formPhysique.reset({
          sexe: 'M',
          nationaliteId: burkinabe ? burkinabe.id : '',
          situationMatrimoniale: ''
        });
      },
      error: (err) => {
        this.creationEnCours.set(false);
        const message = err?.error?.message || 'Impossible de créer la personne';
        this.toastr.error(message);
      }
    });
  }

  // ─── Création à la volée : personne morale ────────────────────────────────
  creerPersonneMorale(): void {
    if (this.formMorale.invalid) {
      this.formMorale.markAllAsTouched();
      this.toastr.warning('Complétez les champs obligatoires de la personne morale');
      return;
    }

    const v = this.formMorale.value;
    const request: PersonneMoraleRequest = {
      denominationSociale: v.denominationSociale!,
      sigle: v.sigle || undefined,
      formeJuridique: v.formeJuridique!,
      rccm: v.rccm || undefined,
      ifu: v.ifu || undefined,
      secteurActivite: v.secteurActivite!,
      siegeSocial: v.siegeSocial!,
      capitalSocial: v.capitalSocial ?? undefined,
      dateCreationEntreprise: v.dateCreationEntreprise
        ? this.toIsoDate(v.dateCreationEntreprise)
        : undefined,
      telephone: v.telephone || undefined,
      email: v.email || undefined
    };

    this.creationEnCours.set(true);
    this.personneMoraleService.creer(request).subscribe({
      next: (created: any) => {
        const resume: PersonneResumeResponse = {
          id: created.id,
          typePersonne: 'MORALE',
          nomAffichage: created.nomAffichage || v.denominationSociale!,
          statutAncrage: 'EN_INSTRUCTION',
          nombreDossiersValides: 0,
          dateCreation: created.dateCreation || new Date().toISOString()
        };
        this.personneSelectionnee.set(resume);
        this.mode.set('rechercher');
        this.creationEnCours.set(false);
        this.toastr.success('Personne morale créée et sélectionnée');
        this.formMorale.reset();
      },
      error: (err) => {
        this.creationEnCours.set(false);
        const message = err?.error?.message || 'Impossible de créer la personne morale';
        this.toastr.error(message);
      }
    });
  }

  // ─── Enregistrement de l'implication ──────────────────────────────────────
  fermer(): void {
    this.dialogRef.close(false);
  }

  enregistrer(): void {
    const personne = this.personneSelectionnee();
    if (!personne) {
      this.toastr.warning('Sélectionnez ou créez d\'abord une personne');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Complétez les champs obligatoires du rôle');
      return;
    }

    const v = this.form.value;
    const request: ImplicationRequest = {
      personneId: personne.id,
      roleImplicationId: v.roleImplicationId!,
      entiteOrganisationId: v.entiteOrganisationId ?? undefined,
      entiteLibelleALEpoque: v.entiteLibelleALEpoque || undefined,
      fonctionOccupee: v.fonctionOccupee || undefined,
      dateDebut: this.toIsoDate(v.dateDebut!),
      dateFin: v.dateFin ? this.toIsoDate(v.dateFin) : undefined,
      observations: v.observations || undefined
    };

    this.enregistrement.set(true);
    this.dossierService.ajouterImplication(this.data.dossierId, request).subscribe({
      next: () => {
        this.toastr.success(`${personne.nomAffichage} a été ajouté(e) au dossier`);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Ajout implication échoué', err);
        this.enregistrement.set(false);
        const message = err?.error?.message || 'Impossible d\'ajouter la personne au dossier';
        this.toastr.error(message);
      }
    });
  }

  private toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
