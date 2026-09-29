import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { 
  LucideAngularModule, 
  User, Building2, Camera, Trash2, Info, Plus, 
  UserPlus, Check, ArrowLeft, ArrowRight, Save, Briefcase, FileText, Phone, 
  LucideIconData 
} from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import { PersonnePhysiqueService } from '../../services/personne-physique.service';
import { PersonneMoraleService } from '../../services/personne-morale.service';
import { PersonneService } from '../../services/personne.service';
import { AliasService } from '../../services/alias.service';
import { PieceIdentiteService } from '../../services/piece-identite.service';
import { PersonnePhotoService } from '../../services/personne-photo.service';
import {
  PersonnePhysiqueRequest, PersonneMoraleRequest,
  AliasRequest, PieceIdentiteRequest
} from '../../models/personne.models';
import { NationaliteService } from '../../../referentiels/services/nationalite.service';
import { TypePieceIdentiteService } from '../../../referentiels/services/type-piece-identite.service';
import { NationaliteResponse, TypePieceIdentiteResponse } from '../../../referentiels/models/referentiel.models';
import { ChampNip } from '../../composants/champ-nip/champ-nip';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';

type TypePersonne = 'PHYSIQUE' | 'MORALE';

interface OptionRepresentant {
  id: string;
  nomAffichage: string;
}

@Component({
  selector: 'app-personne-creation',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatAutocompleteModule, MatProgressSpinnerModule,
    LucideAngularModule, ChampNip
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './personne-creation.html',
  styleUrl: './personne-creation.scss'
})
export class PersonneCreation implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly servicePhysique = inject(PersonnePhysiqueService);
  private readonly serviceMorale = inject(PersonneMoraleService);
  private readonly personneService = inject(PersonneService);
  private readonly aliasService = inject(AliasService);
  private readonly pieceIdentiteService = inject(PieceIdentiteService);
  private readonly photoService = inject(PersonnePhotoService);
  
  // Injection du service des nationalités
  private readonly nationaliteService = inject(NationaliteService);
  readonly nationalites = signal<NationaliteResponse[]>([]);
  readonly chargementNationalites = signal(false);

  // Injection du service des types de pièce d'identité
  private readonly typePieceIdentiteService = inject(TypePieceIdentiteService);
  readonly typesPieceIdentite = signal<TypePieceIdentiteResponse[]>([]);
  readonly chargementTypesPiece = signal(false);

  readonly icons: Record<string, LucideIconData> = {
    User, Building2, Camera, Trash2, Info, Plus,
    UserPlus, Check, ArrowLeft, ArrowRight, Save, Briefcase, FileText, Phone
  };

  readonly type = signal<TypePersonne>('PHYSIQUE');
  readonly enregistrement = signal(false);

  // ---- Stepper Signals ----
  readonly etapeActive = signal(0);

  readonly etapesPhysique = [
    'Informations identitaires',
    'Informations administratives',
    'Documents d\'identification'
  ];

  readonly etapesMorale = [
    'Identification & activité',
    'Contact, représentant & alias'
  ];

  readonly etapesCourantes = computed<string[]>(() =>
    this.type() === 'PHYSIQUE' ? this.etapesPhysique : this.etapesMorale
  );

  changerType(valeur: TypePersonne): void {
    this.type.set(valeur);
    this.etapeActive.set(0); // reset stepper au changement de type
  }

  // ---- Methodes Stepper ----
  allerEtape(n: number): void {
    // Retour en arrière : toujours autorisé
    if (n <= this.etapeActive()) {
      this.etapeActive.set(n);
      return;
    }
    
    // Aller en avant : chaque étape intermédiaire doit être valide
    for (let i = this.etapeActive(); i < n; i++) {
      this.etapeActive.set(i);
      if (!this.etapeCouranteValide()) {
        this.toastr.warning('Veuillez corriger les champs obligatoires avant de continuer');
        return;
      }
    }
    this.etapeActive.set(n);
  }

  etapeSuivante(): void {
    if (!this.etapeCouranteValide()) {
      this.toastr.warning('Veuillez corriger les champs obligatoires avant de continuer');
      return;
    }
    const max = this.etapesCourantes().length - 1;
    this.etapeActive.update((v) => Math.min(v + 1, max));
  }

  etapePrecedente(): void {
    this.etapeActive.update((v) => Math.max(v - 1, 0));
  }

  // ---- Validations des Étapes ----
  private etapeCouranteValide(): boolean {
    if (this.type() === 'PHYSIQUE') {
      return this.validerEtapePhysique(this.etapeActive());
    }
    return this.validerEtapeMorale(this.etapeActive());
  }

  private validerEtapePhysique(etape: number): boolean {
    const f = this.formulairePhysique.controls;

    if (etape === 0) {
      // Informations identitaires
      const champs = [f.nomNaissance, f.nomUsage, f.prenoms, f.sexe,
                      f.dateNaissance, f.lieuNaissance, f.nationaliteId, f.nip,
                      f.situationMatrimoniale, f.nomConjoint];
      champs.forEach((c) => c.markAsTouched());
      return f.nomNaissance.valid && f.prenoms.valid && f.sexe.valid && f.nationaliteId.valid && f.nip.valid;
    }

    if (etape === 1) {
      const champs = [f.profession, f.matriculeFonctionPublique, f.gradeCategorie, f.adresse, f.telephone];
      champs.forEach((c) => c.markAsTouched());
      return true;
    }
    return true;
  }

  private validerEtapeMorale(etape: number): boolean {
    const f = this.formulaireMorale.controls;

    if (etape === 0) {
      const champs = [f.denominationSociale, f.sigle, f.formeJuridique, f.rccm, f.ifu,
                      f.secteurActivite, f.siegeSocial, f.capitalSocial,
                      f.dateCreationEntreprise, f.statut];
      champs.forEach((c) => c.markAsTouched());
      return f.denominationSociale.valid && f.formeJuridique.valid
          && f.secteurActivite.valid && f.siegeSocial.valid;
    }

    if (etape === 1) {
      const champs = [f.telephone, f.email];
      champs.forEach((c) => c.markAsTouched());
      return f.email.valid;
    }

    return true;
  }

  // ---- Photo / logo ----
  readonly photoFichier = signal<File | null>(null);
  readonly photoApercu = signal<string | null>(null);

  choisirPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0] ?? null;
    this.photoFichier.set(fichier);
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onload = () => this.photoApercu.set(lecteur.result as string);
      lecteur.readAsDataURL(fichier);
    } else {
      this.photoApercu.set(null);
    }
  }

  retirerPhoto(): void {
    this.photoFichier.set(null);
    this.photoApercu.set(null);
  }

  // ---- Personne physique ----
  readonly formulairePhysique = this.fb.group({
    nomNaissance: ['', Validators.required],
    nomUsage: [''],
    prenoms: ['', Validators.required],
    sexe: ['M', Validators.required],
    dateNaissance: [null as Date | string | null],
    lieuNaissance: [''],
    nationaliteId: ['', Validators.required],
    nip: [''], // NIP CNIB (optionnel / validé via ChampNip)
    situationMatrimoniale: [''],
    nomConjoint: [{ value: '', disabled: true }],
    profession: [''],
    matriculeFonctionPublique: [''],
    gradeCategorie: [''],
    adresse: [''],
    telephone: ['']
  });

  readonly estMarie = computed(() =>
    this.formulairePhysique.controls.situationMatrimoniale.value === 'MARIE'
  );

  // ---- Personne morale ----
  readonly formulaireMorale = this.fb.group({
    denominationSociale: ['', Validators.required],
    sigle: [''],
    formeJuridique: ['', Validators.required],
    rccm: [''],
    ifu: [''],
    secteurActivite: ['', Validators.required],
    siegeSocial: ['', Validators.required],
    capitalSocial: [null as number | null],
    dateCreationEntreprise: [null as Date | string | null],
    statut: ['ACTIVE'],
    telephone: [''],
    email: ['', Validators.email],
    representantLegalId: [null as string | null]
  });

  readonly rechercheRepresentant = new FormControl('');
  readonly optionsRepresentant = signal<OptionRepresentant[]>([]);
  readonly representantChoisi = signal<OptionRepresentant | null>(null);
  private readonly rechercheSubject = new Subject<string>();

  // ---- Alias ----
  readonly formAliasCourant = this.fb.group({
    nomAlias: ['', Validators.required],
    commentaire: ['']
  });
  readonly aliasAccumules = signal<AliasRequest[]>([]);

  ajouterAlias(): void {
    if (this.formAliasCourant.invalid) return;
    const v = this.formAliasCourant.getRawValue();
    this.aliasAccumules.update((liste) => [...liste, { nomAlias: v.nomAlias!, commentaire: v.commentaire || undefined }]);
    this.formAliasCourant.reset({ nomAlias: '', commentaire: '' });
  }

  retirerAlias(index: number): void {
    this.aliasAccumules.update((liste) => liste.filter((_, i) => i !== index));
  }

  // ---- Pieces d'identite ----
  readonly formPieceCourante = this.fb.group({
    typePieceId: ['', Validators.required],
    numero: ['', Validators.required],
    dateDelivrance: [null as Date | null],
    dateExpiration: [null as Date | null]
  });
  readonly piecesAccumulees = signal<PieceIdentiteRequest[]>([]);

  ajouterPiece(): void {
    if (this.formPieceCourante.invalid) return;
    const v = this.formPieceCourante.getRawValue();
    this.piecesAccumulees.update((liste) => [...liste, {
      typePieceId: v.typePieceId!,
      numero: v.numero!,
      dateDelivrance: v.dateDelivrance instanceof Date ? v.dateDelivrance.toISOString().substring(0, 10) : undefined,
      dateExpiration: v.dateExpiration instanceof Date ? v.dateExpiration.toISOString().substring(0, 10) : undefined
    }]);

    const cnib = this.typesPieceIdentite().find(t => t.code === 'CNIB');
    this.formPieceCourante.reset({
      typePieceId: cnib?.id ?? '',
      numero: '',
      dateDelivrance: null,
      dateExpiration: null
    });
  }

  retirerPiece(index: number): void {
    this.piecesAccumulees.update((liste) => liste.filter((_, i) => i !== index));
  }
  
  libelleTypePiece(typePieceId: string | undefined): string {
    if (!typePieceId) return '—';
    return this.typesPieceIdentite().find(t => t.id === typePieceId)?.libelle ?? '—';
  }

  constructor() {
    this.formulairePhysique.controls.situationMatrimoniale.valueChanges.subscribe((valeur) => {
      const controle = this.formulairePhysique.controls.nomConjoint;
      if (valeur === 'MARIE') {
        controle.enable({ emitEvent: false });
      } else {
        controle.disable({ emitEvent: false });
        controle.setValue('', { emitEvent: false });
      }
    });

    this.rechercheSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((terme) => terme.trim().length < 2
        ? []
        : this.personneService.rechercheAvancee({
            page: 0, size: 10, nomOuDenomination: terme, typePersonne: 'PHYSIQUE'
          })
      )
    ).subscribe((page) => {
      const resultats = Array.isArray(page) ? page : page.content;
      this.optionsRepresentant.set(resultats.map((p) => ({ id: p.id, nomAffichage: p.nomAffichage })));
    });
  }

  ngOnInit(): void {
    this.chargerNationalites();
    this.chargerTypesPieceIdentite();
  }

  private chargerNationalites(): void {
    this.chargementNationalites.set(true);
    this.nationaliteService.listerActifs().subscribe({
      next: (liste) => {
        this.nationalites.set(liste);
        // Pré-sélection Burkinabè
        const burkinabe = liste.find(n => n.libelle === 'Burkinabè');
        if (burkinabe) {
          this.formulairePhysique.patchValue({ nationaliteId: burkinabe.id });
        }
        this.chargementNationalites.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les nationalités');
        this.chargementNationalites.set(false);
      }
    });
  }

  private chargerTypesPieceIdentite(): void {
    this.chargementTypesPiece.set(true);
    this.typePieceIdentiteService.listerActifs().subscribe({
      next: (liste) => {
        this.typesPieceIdentite.set(liste);
        // Pré-sélection : CNIB par défaut si présent
        const cnib = liste.find(t => t.code === 'CNIB');
        if (cnib) {
          this.formPieceCourante.patchValue({ typePieceId: cnib.id });
        }
        this.chargementTypesPiece.set(false);
      },
      error: () => this.chargementTypesPiece.set(false)
    });
  }

  chercherRepresentant(terme: string): void {
    this.rechercheSubject.next(terme);
  }

  choisirRepresentant(option: OptionRepresentant): void {
    this.representantChoisi.set(option);
    this.formulaireMorale.controls.representantLegalId.setValue(option.id);
    this.rechercheRepresentant.setValue(option.nomAffichage);
  }

  retirerRepresentant(): void {
    this.representantChoisi.set(null);
    this.formulaireMorale.controls.representantLegalId.setValue(null);
    this.rechercheRepresentant.setValue('');
  }

  displayRepresentant(option: OptionRepresentant | string | null): string {
    if (!option) return '';
    return typeof option === 'string' ? option : option.nomAffichage;
  }

  get formulaireInvalide(): boolean {
    return this.type() === 'PHYSIQUE'
      ? this.formulairePhysique.invalid
      : this.formulaireMorale.invalid;
  }

  async enregistrer(): Promise<void> {
    if (this.formulaireInvalide) {
      if (this.type() === 'PHYSIQUE') {
        if (!this.validerEtapePhysique(0)) { this.etapeActive.set(0); }
        else if (!this.validerEtapePhysique(1)) { this.etapeActive.set(1); }
        else { this.etapeActive.set(2); }
      } else {
        if (!this.validerEtapeMorale(0)) { this.etapeActive.set(0); }
        else { this.etapeActive.set(1); }
      }
      this.toastr.warning('Veuillez corriger les champs obligatoires');
      return;
    }

    this.enregistrement.set(true);

    let personneId: string;

    try {
      if (this.type() === 'PHYSIQUE') {
        const brut = this.formulairePhysique.getRawValue();
        const dateBrute = brut.dateNaissance;
        
        const request: PersonnePhysiqueRequest = {
          ...brut,
          nip: brut.nip || undefined,
          dateNaissance: dateBrute instanceof Date ? dateBrute.toISOString().substring(0, 10) : (dateBrute ?? undefined),
          situationMatrimoniale: (brut.situationMatrimoniale || undefined) as PersonnePhysiqueRequest['situationMatrimoniale']
        } as PersonnePhysiqueRequest;

        const reponse = await firstValueFrom(this.servicePhysique.creer(request));
        personneId = reponse.id;
      } else {
        const brut = this.formulaireMorale.getRawValue();
        const dateBrute = brut.dateCreationEntreprise;
        const request: PersonneMoraleRequest = {
          ...brut,
          dateCreationEntreprise: dateBrute instanceof Date ? dateBrute.toISOString().substring(0, 10) : (dateBrute ?? undefined),
          capitalSocial: brut.capitalSocial ?? undefined,
          representantLegalId: brut.representantLegalId ?? undefined
        } as PersonneMoraleRequest;

        const reponse = await firstValueFrom(this.serviceMorale.creer(request));
        personneId = reponse.id;
      }
    } catch (err) {
      this.toastr.error(messageErreurHttp(err, 'Échec de la création'));
      this.enregistrement.set(false);
      return;
    }

    const fichierPhoto = this.photoFichier();
    if (fichierPhoto) {
      try {
        await firstValueFrom(this.photoService.deposer(personneId, fichierPhoto));
      } catch (err) {
        this.toastr.error(messageErreurHttp(err, "La photo n'a pas pu être envoyée — réessayez depuis la fiche"));
      }
    }

    for (const alias of this.aliasAccumules()) {
      try {
        await firstValueFrom(this.aliasService.creer(personneId, alias));
      } catch (err) {
        this.toastr.error(messageErreurHttp(err, "Un alias n'a pas pu être enregistré"));
      }
    }

    if (this.type() === 'PHYSIQUE') {
      for (const piece of this.piecesAccumulees()) {
        try {
          await firstValueFrom(this.pieceIdentiteService.creer(personneId, piece));
        } catch (err) {
          this.toastr.error(messageErreurHttp(err, "Une pièce d'identité n'a pas pu être enregistrée"));
        }
      }
    }

    this.toastr.success(this.type() === 'PHYSIQUE' ? 'Personne physique créée' : 'Personne morale créée');
    this.router.navigate(['/personnes', personneId], { queryParams: { creation: 'succes' } });
  }
}
