import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, switchMap, of } from 'rxjs';
import {
  LucideAngularModule,
  Camera, Trash2, Building2, X, Save, UserCog,
  Briefcase, User, Phone, Tag, Info,
  LucideIconData
} from 'lucide-angular';

import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import { PersonneMoraleResponse, PersonneMoraleRequest, PersonneResumeResponse, AliasResponse } from '../../models/personne.models';
import { PersonneService } from '../../services/personne.service';
import { AliasService } from '../../services/alias.service';
import { PersonnePhotoService } from '../../services/personne-photo.service';

interface OptionRepresentant {
  id: string;
  nomAffichage: string;
}

@Component({
  selector: 'app-personne-morale-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatAutocompleteModule,
    LucideAngularModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './personne-morale-form-dialog.html',
  styleUrl: './personne-morale-form-dialog.scss'
})
export class PersonneMoraleFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PersonneMoraleFormDialog>);
  private readonly toastr = inject(ToastrService);
  private readonly personneService = inject(PersonneService);
  private readonly aliasService = inject(AliasService);
  private readonly photoService = inject(PersonnePhotoService);

  readonly data = inject<PersonneMoraleResponse>(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = {
    Camera, Trash2, Building2, X, Save, UserCog,
    Briefcase, User, Phone, Tag, Info
  };

  // ═══════ Formulaire principal ═══════
  readonly formulaire = this.fb.group({
    denominationSociale: [this.data.denominationSociale, Validators.required],
    sigle: [this.data.sigle ?? ''],
    formeJuridique: [this.data.formeJuridique, Validators.required],
    rccm: [this.data.rccm ?? ''],
    ifu: [this.data.ifu ?? ''],
    secteurActivite: [this.data.secteurActivite, Validators.required],
    siegeSocial: [this.data.siegeSocial, Validators.required],
    capitalSocial: [this.data.capitalSocial ?? null],
    dateCreationEntreprise: [this.data.dateCreationEntreprise ? new Date(this.data.dateCreationEntreprise) : null],
    statut: [this.data.statut ?? 'ACTIVE'],
    telephone: [this.data.telephone ?? ''],
    email: [this.data.email ?? '', Validators.email],
    representantLegalId: [this.data.representantLegalId ?? null]
  });

  // ═══════ Photo/logo (upload immédiat) ═══════
  readonly aPhoto = signal(this.data.aUnLogo);
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
        this.toastr.success('Logo mis à jour');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, "Échec de l'envoi du logo"))
    });
  }

  supprimerPhoto(): void {
    this.photoService.supprimer(this.data.id).subscribe({
      next: () => {
        this.aPhoto.set(false);
        this.toastr.success('Logo supprimé');
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
    });
  }

  // ═══════ Représentant légal (autocomplete) ═══════
  readonly rechercheRepresentant = new FormControl(this.data.representantLegalNomComplet ?? '');
  readonly optionsRepresentant = signal<OptionRepresentant[]>([]);
  readonly representantChoisi = signal<OptionRepresentant | null>(
    this.data.representantLegalId
      ? { id: this.data.representantLegalId, nomAffichage: this.data.representantLegalNomComplet ?? '' }
      : null
  );

  private readonly rechercheSubject = new Subject<string>();

  chercherRepresentant(terme: string): void {
    this.rechercheSubject.next(terme);
  }

  choisirRepresentant(option: OptionRepresentant): void {
    this.representantChoisi.set(option);
    this.formulaire.controls.representantLegalId.setValue(option.id);
    this.rechercheRepresentant.setValue(option.nomAffichage);
  }

  retirerRepresentant(): void {
    this.representantChoisi.set(null);
    this.formulaire.controls.representantLegalId.setValue(null);
    this.rechercheRepresentant.setValue('');
  }

  displayRepresentant(option: OptionRepresentant | string | null): string {
    if (!option) return '';
    return typeof option === 'string' ? option : option.nomAffichage;
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
    this.rechercheSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((terme): Observable<PersonneResumeResponse[]> => {
        if (!terme || terme.trim().length < 2) return of([]);
        return this.personneService.rechercheAvancee({
          page: 0,
          size: 10,
          nomOuDenomination: terme,
          typePersonne: 'PHYSIQUE'
        }).pipe(map((page) => page.content ?? []));
      })
    ).subscribe((resultats) => {
      this.optionsRepresentant.set(
        resultats.map((p) => ({ id: p.id, nomAffichage: p.nomAffichage }))
      );
    });

    this.aliasService.lister(this.data.id).subscribe({
      next: (d) => this.aliasListe.set(d),
      error: () => {}
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
    const dateBrute = brut.dateCreationEntreprise;
    const request: PersonneMoraleRequest = {
      ...brut,
      dateCreationEntreprise: dateBrute instanceof Date
        ? dateBrute.toISOString().substring(0, 10)
        : (dateBrute ?? undefined),
      capitalSocial: brut.capitalSocial ?? undefined,
      representantLegalId: brut.representantLegalId ?? undefined
    } as PersonneMoraleRequest;
    this.dialogRef.close(request);
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
