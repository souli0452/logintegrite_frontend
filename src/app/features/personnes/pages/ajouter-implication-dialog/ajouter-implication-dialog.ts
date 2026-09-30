import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  MatDialogModule, MatDialogRef, MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';

import { DossierService } from '../../../dossiers/services/dossier.service';
import { SourceSignalementService } from '../../../referentiels/services/source-signalement.service';
import { RoleImplicationService } from '../../../referentiels/services/role-implication.service';
import {
  SourceSignalementResponse,
  RoleImplicationResponse
} from '../../../referentiels/models/referentiel.models';
import { DossierResponse } from '../../../dossiers/models/dossier.models';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';

export interface AjouterImplicationDialogData {
  personneId: string;
  personneNomAffichage: string;
  dossiersDejaLies: string[];
}

@Component({
  selector: 'app-ajouter-implication-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatButtonModule, MatButtonToggleModule,
    MatProgressSpinnerModule
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './ajouter-implication-dialog.html',
  styleUrl: './ajouter-implication-dialog.scss'
})
export class AjouterImplicationDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AjouterImplicationDialog>);
  private readonly toastr = inject(ToastrService);
  private readonly dossierService = inject(DossierService);
  private readonly sourceService = inject(SourceSignalementService);
  private readonly roleService = inject(RoleImplicationService);

  readonly data = inject<AjouterImplicationDialogData>(MAT_DIALOG_DATA);

  // Mode selectionne : dossier existant OU nouveau dossier
  readonly modeChoix = signal<'existant' | 'nouveau'>('nouveau');

  // Referentiels
  readonly sources = signal<SourceSignalementResponse[]>([]);
  readonly roles = signal<RoleImplicationResponse[]>([]);
  readonly dossiersOuverts = signal<DossierResponse[]>([]);

  // Filtre dynamique pour la recherche de dossiers existants
  readonly filtreDossier = signal('');

  readonly dossiersFiltres = computed(() => {
    const terme = this.filtreDossier().toLowerCase().trim();
    return this.dossiersOuverts()
      .filter((d) => !this.data.dossiersDejaLies.includes(d.id))
      .filter((d) => !terme
        || (d.numeroDossier ?? '').toLowerCase().includes(terme)
        || (d.intitule ?? '').toLowerCase().includes(terme));
  });

  // Etat
  readonly enCoursCreation = signal(false);

  // Formulaire nouveau dossier (mode 'nouveau')
  readonly formNouveauDossier = this.fb.group({
    intitule: ['', Validators.required],
    sourceSignalementId: ['', Validators.required],
    dateOuverture: [new Date(), Validators.required],
    descriptionContexte: ['']
  });

  // Formulaire selection dossier existant (mode 'existant')
  readonly formDossierExistant = this.fb.group({
    dossierId: ['', Validators.required]
  });

  // Formulaire implication (commun aux 2 modes)
  readonly formImplication = this.fb.group({
    roleImplicationId: ['', Validators.required],
    fonctionOccupee: [''],
    entiteLibelleALEpoque: [''],
    dateDebut: [new Date(), Validators.required],
    dateFin: [null as Date | null],
    observations: ['']
  });

  constructor() {
    this.sourceService.lister().subscribe({ next: (d) => this.sources.set(d), error: () => {} });
    this.roleService.lister().subscribe({ next: (d) => this.roles.set(d), error: () => {} });

    // Charger les dossiers OUVERTS pour le mode 'existant'
    this.dossierService.lister(0, 100).subscribe({
      next: (page) => this.dossiersOuverts.set(page.content.filter((d) => d.statutDossier === 'OUVERT')),
      error: () => {}
    });
  }

  changerMode(mode: 'existant' | 'nouveau'): void {
    this.modeChoix.set(mode);
  }

  formulaireValide(): boolean {
    if (this.modeChoix() === 'nouveau') {
      return this.formNouveauDossier.valid && this.formImplication.valid;
    }
    return this.formDossierExistant.valid && this.formImplication.valid;
  }

  async soumettre(): Promise<void> {
    if (!this.formulaireValide()) {
      if (this.modeChoix() === 'nouveau') {
        this.formNouveauDossier.markAllAsTouched();
      } else {
        this.formDossierExistant.markAllAsTouched();
      }
      this.formImplication.markAllAsTouched();
      this.toastr.warning('Complétez tous les champs obligatoires');
      return;
    }

    this.enCoursCreation.set(true);

    try {
      let dossierId: string;

      // MODE 1 : creer un nouveau dossier
      if (this.modeChoix() === 'nouveau') {
        const v = this.formNouveauDossier.getRawValue();
        const dossierRequest = {
          intitule: v.intitule!,
          sourceSignalementId: v.sourceSignalementId!,
          dateOuverture: (v.dateOuverture as Date).toISOString().substring(0, 10),
          descriptionContexte: v.descriptionContexte || undefined
        };
        const dossier = await firstValueFrom(this.dossierService.creer(dossierRequest));
        dossierId = dossier.id;
      } else {
        // MODE 2 : utiliser un dossier existant
        dossierId = this.formDossierExistant.value.dossierId!;
      }

      // Ajouter l'implication au dossier
      const imp = this.formImplication.getRawValue();
      const dateFinFormatee = imp.dateFin instanceof Date
        ? imp.dateFin.toISOString().substring(0, 10)
        : undefined;

      const implicationRequest = {
        personneId: this.data.personneId,
        roleImplicationId: imp.roleImplicationId!,
        fonctionOccupee: imp.fonctionOccupee || undefined,
        entiteLibelleALEpoque: imp.entiteLibelleALEpoque || undefined,
        dateDebut: (imp.dateDebut as Date).toISOString().substring(0, 10),
        dateFin: dateFinFormatee,
        observations: imp.observations || undefined
      };

      await firstValueFrom(this.dossierService.ajouterImplication(dossierId, implicationRequest));

      this.toastr.success(
        this.modeChoix() === 'nouveau'
          ? 'Dossier créé et personne ajoutée'
          : 'Personne ajoutée au dossier'
      );
      this.dialogRef.close({ dossierId, cree: true });

    } catch (erreur: unknown) {
      const err = erreur as HttpErrorResponse;
      let msg = '';
      if (err?.status === 409) {
        msg = this.modeChoix() === 'nouveau'
          ? 'Un dossier avec ce numéro existe déjà. Laissez le champ vide ou choisissez un autre numéro.'
          : 'Cette personne est déjà impliquée dans ce dossier.';
      } else if (err?.status === 400) {
        msg = err?.error?.errors?.[0]?.defaultMessage
          ?? err?.error?.message
          ?? 'Données invalides';
      } else if (err?.status === 403) {
        msg = 'Vous n\'avez pas les droits pour cette action';
      } else {
        msg = err?.error?.message ?? "Échec de l'opération";
      }
      this.toastr.error(msg);
      this.enCoursCreation.set(false);
    }
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
