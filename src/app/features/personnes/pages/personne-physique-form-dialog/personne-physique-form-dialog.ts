import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule,
  Camera, Trash2, User, X, Save, UserCog,
  IdCard, Briefcase, Tag, Info, AlertCircle,
  LucideIconData
} from 'lucide-angular';

import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import {
  PersonnePhysiqueResponse, PersonnePhysiqueRequest,
  AliasResponse, PieceIdentiteResponse, TypePieceIdentite
} from '../../models/personne.models';
import { AliasService } from '../../services/alias.service';
import { PieceIdentiteService } from '../../services/piece-identite.service';
import { PersonnePhotoService } from '../../services/personne-photo.service';

// 🆕 Référentiels F.1 (Nationalité) et F.5 (Type de pièce d'identité)
import { NationaliteService } from '../../../referentiels/services/nationalite.service';
import { TypePieceIdentiteService } from '../../../referentiels/services/type-piece-identite.service';
import {
  NationaliteResponse,
  TypePieceIdentiteResponse
} from '../../../referentiels/models/referentiel.models';
import { ChampNip } from '../../composants/champ-nip/champ-nip';


@Component({
  selector: 'app-personne-physique-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule,ChampNip,
    LucideAngularModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './personne-physique-form-dialog.html',
  styleUrl: './personne-physique-form-dialog.scss'
})
export class PersonnePhysiqueFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PersonnePhysiqueFormDialog>);
  private readonly toastr = inject(ToastrService);
  private readonly aliasService = inject(AliasService);
  private readonly pieceIdentiteService = inject(PieceIdentiteService);
  private readonly photoService = inject(PersonnePhotoService);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly typePieceService = inject(TypePieceIdentiteService);

  readonly data = inject<PersonnePhysiqueResponse>(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = {
    Camera, Trash2, User, X, Save, UserCog, IdCard, Briefcase, Tag, Info, AlertCircle
  };

  // ═══════ Chargement des référentiels ═══════
  readonly nationalites = signal<NationaliteResponse[]>([]);
  readonly chargementNationalites = signal(false);

  readonly typesPieceIdentite = signal<TypePieceIdentiteResponse[]>([]);
  readonly chargementTypesPiece = signal(false);

  // ═══════ Formulaire principal ═══════
  readonly formulaire = this.fb.group({
    nomNaissance: [this.data.nomNaissance, Validators.required],
    nomUsage: [this.data.nomUsage ?? ''],
    prenoms: [this.data.prenoms, Validators.required],
    nip: [this.data.nip ?? ''],
    sexe: [this.data.sexe, Validators.required],
    dateNaissance: [this.data.dateNaissance ? new Date(this.data.dateNaissance) : null],
    lieuNaissance: [this.data.lieuNaissance ?? ''],
    // 🆕 Nationalité par ID (Vague F.1)
    nationaliteId: [(this.data as any).nationaliteId ?? '', Validators.required],
    situationMatrimoniale: [this.data.situationMatrimoniale ?? ''],
    nomConjoint: [{
      value: this.data.nomConjoint ?? '',
      disabled: this.data.situationMatrimoniale !== 'MARIE'
    }],
    profession: [this.data.profession ?? ''],
    matriculeFonctionPublique: [this.data.matriculeFonctionPublique ?? ''],
    gradeCategorie: [this.data.gradeCategorie ?? ''],
    adresse: [this.data.adresse ?? ''],
    telephone: [this.data.telephone ?? '']
  });

  readonly estMarie = computed(() =>
    this.formulaire.controls.situationMatrimoniale.value === 'MARIE'
  );

  // ═══════ Photo (upload immédiat) ═══════
  readonly aPhoto = signal(this.data.aUnePhoto);
  readonly cleRafraichissement = signal(Date.now());

  urlPhoto(): string {
    return `${this.photoService.urlPhoto(this.data.id)}?v=${this.cleRafraichissement()}`;
  }

  choisirPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;
    this.photoService.deposer(this.data.id, fichier).subscribe({
      next: () => {
        this.aPhoto.set(true);
        this.cleRafraichissement.set(Date.now());
        this.toastr.success('Photo mise à jour');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, "Échec de l'envoi de la photo"))
    });
  }

  supprimerPhoto(): void {
    this.photoService.supprimer(this.data.id).subscribe({
      next: () => {
        this.aPhoto.set(false);
        this.toastr.success('Photo supprimée');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
    });
  }

  // ═══════ Pièces d'identité (CRUD immédiat) ═══════
  readonly piecesListe = signal<PieceIdentiteResponse[]>([]);
  readonly formPieceCourante = this.fb.group({
    typePieceId: ['', Validators.required],
    numero: ['', Validators.required],
    dateDelivrance: [null as Date | null],
    dateExpiration: [null as Date | null]
  });

  ajouterPiece(): void {
    if (this.formPieceCourante.invalid) {
      this.formPieceCourante.markAllAsTouched();
      return;
    }
    const v = this.formPieceCourante.getRawValue();
    this.pieceIdentiteService.creer(this.data.id, {
      typePieceId: v.typePieceId!,
      numero: v.numero!,
      dateDelivrance: v.dateDelivrance instanceof Date
        ? v.dateDelivrance.toISOString().substring(0, 10)
        : undefined,
      dateExpiration: v.dateExpiration instanceof Date
        ? v.dateExpiration.toISOString().substring(0, 10)
        : undefined
    } as any).subscribe({
      next: (nouvelle) => {
        this.piecesListe.update((liste) => [...liste, nouvelle]);
        const cnib = this.typesPieceIdentite().find(t => t.code === 'CNIB');
        this.formPieceCourante.reset({
          typePieceId: cnib?.id ?? '',
          numero: '',
          dateDelivrance: null,
          dateExpiration: null
        });
        this.toastr.success('Pièce ajoutée');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, "Échec de l'ajout"))
    });
  }

  supprimerPiece(id: string): void {
    this.pieceIdentiteService.supprimer(id).subscribe({
      next: () => {
        this.piecesListe.update((liste) => liste.filter((p) => p.id !== id));
        this.toastr.success('Pièce supprimée');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
    });
  }

  /**
   * Retourne le libellé d'un type de pièce, en priorisant :
   * 1. Le libellé calculé côté back (typePieceLibelle)
   * 2. Le libellé du référentiel via l'ID
   * 3. La valeur enum legacy en dernier recours
   */
  libelleTypePiece(piece: PieceIdentiteResponse | any): string {
    if (piece.typePieceLibelle) return piece.typePieceLibelle;
    if (piece.typePieceId) {
      const trouve = this.typesPieceIdentite().find(t => t.id === piece.typePieceId);
      if (trouve) return trouve.libelle;
    }
    return piece.typePiece ?? '—';
  }

  // ═══════ Alias (CRUD immédiat) ═══════
  readonly aliasListe = signal<AliasResponse[]>([]);
  readonly formAliasCourant = this.fb.group({
    nomAlias: ['', Validators.required],
    commentaire: ['']
  });

  ajouterAlias(): void {
    if (this.formAliasCourant.invalid) {
      this.formAliasCourant.markAllAsTouched();
      return;
    }
    const v = this.formAliasCourant.getRawValue();
    this.aliasService.creer(this.data.id, {
      nomAlias: v.nomAlias!,
      commentaire: v.commentaire || undefined
    }).subscribe({
      next: (nouveau) => {
        this.aliasListe.update((liste) => [...liste, nouveau]);
        this.formAliasCourant.reset({ nomAlias: '', commentaire: '' });
        this.toastr.success('Alias ajouté');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, "Échec de l'ajout"))
    });
  }

  supprimerAlias(id: string): void {
    this.aliasService.supprimer(id).subscribe({
      next: () => {
        this.aliasListe.update((liste) => liste.filter((a) => a.id !== id));
        this.toastr.success('Alias supprimé');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
    });
  }

  // ═══════ Init ═══════
  constructor() {
    // Activation dynamique du champ conjoint
    this.formulaire.controls.situationMatrimoniale.valueChanges.subscribe((valeur) => {
      const controle = this.formulaire.controls.nomConjoint;
      if (valeur === 'MARIE') {
        controle.enable({ emitEvent: false });
      } else {
        controle.disable({ emitEvent: false });
        controle.setValue('', { emitEvent: false });
      }
    });

    // Chargement des listes existantes
    this.pieceIdentiteService.lister(this.data.id).subscribe({
      next: (d) => this.piecesListe.set(d),
      error: () => {}
    });
    this.aliasService.lister(this.data.id).subscribe({
      next: (d) => this.aliasListe.set(d),
      error: () => {}
    });

    // Chargement des référentiels
    this.chargerNationalites();
    this.chargerTypesPieceIdentite();
  }

  private chargerNationalites(): void {
    this.chargementNationalites.set(true);
    this.nationaliteService.listerActifs().subscribe({
      next: (liste) => {
        this.nationalites.set(liste);
        // Si aucune nationalite_id sur la fiche, tenter de matcher le texte legacy
        const idActuel = this.formulaire.controls.nationaliteId.value;
        if (!idActuel && this.data.nationalite) {
          const match = liste.find(n =>
            n.libelle.toLowerCase() === this.data.nationalite!.toLowerCase()
          );
          if (match) {
            this.formulaire.controls.nationaliteId.setValue(match.id);
          }
        }
        this.chargementNationalites.set(false);
      },
      error: () => this.chargementNationalites.set(false)
    });
  }

  private chargerTypesPieceIdentite(): void {
    this.chargementTypesPiece.set(true);
    this.typePieceService.listerActifs().subscribe({
      next: (liste) => {
        this.typesPieceIdentite.set(liste);
        const cnib = liste.find(t => t.code === 'CNIB');
        if (cnib && !this.formPieceCourante.value.typePieceId) {
          this.formPieceCourante.patchValue({ typePieceId: cnib.id });
        }
        this.chargementTypesPiece.set(false);
      },
      error: () => this.chargementTypesPiece.set(false)
    });
  }

  // ═══════ Actions ═══════
  soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.toastr.warning('Complétez les champs obligatoires');
      return;
    }
    const brut = this.formulaire.getRawValue();
    const dateBrute = brut.dateNaissance;
    const request: PersonnePhysiqueRequest = {
      ...brut,
      dateNaissance: dateBrute instanceof Date
        ? dateBrute.toISOString().substring(0, 10)
        : (dateBrute ?? undefined),
      situationMatrimoniale: (brut.situationMatrimoniale || undefined) as PersonnePhysiqueRequest['situationMatrimoniale']
    } as PersonnePhysiqueRequest;
    this.dialogRef.close(request);
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
