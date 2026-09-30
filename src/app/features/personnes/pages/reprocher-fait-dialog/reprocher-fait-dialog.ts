import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { TypeInfractionService } from '../../../referentiels/services/type-infraction.service';
import { ZoneGeographiqueService } from '../../../referentiels/services/zone-geographique.service';
import {
  SourceSignalementResponse,
  RoleImplicationResponse,
  TypeInfractionResponse,
  ZoneGeographiqueResponse
} from '../../../referentiels/models/referentiel.models';
import { DossierResponse } from '../../../dossiers/models/dossier.models';
import { ImplicationResponse } from '../../models/personne.models';
import { messageErreurHttp } from '../../../../shared/utils/http-error.util';

import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';

export interface ReprocherFaitDialogData {
  personneId: string;
  personneNomAffichage: string;
  implicationsActuelles: ImplicationResponse[];
}

@Component({
  selector: 'app-reprocher-fait-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatButtonModule, MatButtonToggleModule,
    MatProgressSpinnerModule
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './reprocher-fait-dialog.html',
  styleUrl: './reprocher-fait-dialog.scss'
})
export class ReprocherFaitDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ReprocherFaitDialog>);
  private readonly toastr = inject(ToastrService);
  private readonly dossierService = inject(DossierService);
  private readonly sourceService = inject(SourceSignalementService);
  private readonly roleService = inject(RoleImplicationService);
  private readonly typeInfractionService = inject(TypeInfractionService);
  private readonly zoneService = inject(ZoneGeographiqueService);

  readonly data = inject<ReprocherFaitDialogData>(MAT_DIALOG_DATA);

  // Si la personne n'a AUCUNE implication existante, on force le mode 'nouveau'
  readonly aDesImplications = computed(() => this.data.implicationsActuelles.length > 0);
  readonly modeChoix = signal<'existant' | 'nouveau'>(
    this.data.implicationsActuelles.length > 0 ? 'existant' : 'nouveau'
  );

  // Referentiels
  readonly sources = signal<SourceSignalementResponse[]>([]);
  readonly roles = signal<RoleImplicationResponse[]>([]);
  readonly typesInfraction = signal<TypeInfractionResponse[]>([]);
  readonly zones = signal<ZoneGeographiqueResponse[]>([]);

  readonly enCoursCreation = signal(false);

  // Mode 'existant' : selection d'un dossier deja implique
  readonly formDossierExistant = this.fb.group({
    dossierId: ['', Validators.required]
  });

  // Mode 'nouveau' : creer un nouveau dossier + nouvelle implication
  readonly formNouveauDossier = this.fb.group({
    intitule: ['', Validators.required],
    sourceSignalementId: ['', Validators.required],
    dateOuverture: [new Date(), Validators.required],
    descriptionContexte: ['']
  });

  readonly formImplication = this.fb.group({
    roleImplicationId: ['', Validators.required],
    fonctionOccupee: [''],
    entiteLibelleALEpoque: [''],
    dateDebut: [new Date(), Validators.required],
    dateFin: [null as Date | null],
    observations: ['']
  });

  // Formulaire du fait (commun aux 2 modes)
  readonly formFait = this.fb.group({
    typeInfractionId: ['', Validators.required],
    zoneGeographiqueId: [''],
    dateFaits: [new Date(), Validators.required],
    lieuPrecis: [''],
    description: ['', Validators.required],
    montantPrejudice: [0, [Validators.required, Validators.min(0)]],
    devise: ['XOF', Validators.required]
  });

  // Dossiers disponibles = ceux ou la personne est deja impliquee, filtrees OUVERTS
  readonly dossiersDejaImpliques = computed(() => {
    const dossierIdsUniques = [...new Set(this.data.implicationsActuelles.map((i) => i.dossierId))];
    return this.dossiersOuverts().filter((d) => dossierIdsUniques.includes(d.id));
  });

  private readonly dossiersOuverts = signal<DossierResponse[]>([]);

  constructor() {
    this.sourceService.lister().subscribe({ next: (d) => this.sources.set(d), error: () => {} });
    this.roleService.lister().subscribe({ next: (d) => this.roles.set(d), error: () => {} });
    this.typeInfractionService.lister().subscribe({ next: (d) => this.typesInfraction.set(d), error: () => {} });
    this.zoneService.lister().subscribe({ next: (d) => this.zones.set(d), error: () => {} });

    // Charger les dossiers ouverts pour filtrer avec les implications
    this.dossierService.lister(0, 100).subscribe({
      next: (page) => this.dossiersOuverts.set(page.content.filter((d) => d.statutDossier === 'OUVERT')),
      error: () => {}
    });
  }

  changerMode(mode: 'existant' | 'nouveau'): void {
    this.modeChoix.set(mode);
  }

  formulaireValide(): boolean {
    if (!this.formFait.valid) return false;
    if (this.modeChoix() === 'existant') {
      return this.formDossierExistant.valid;
    }
    return this.formNouveauDossier.valid && this.formImplication.valid;
  }

  async soumettre(): Promise<void> {
    if (!this.formulaireValide()) return;
    this.enCoursCreation.set(true);

    try {
      let dossierId: string;

      // Mode 1 : creer un nouveau dossier + ajouter l'implication
      if (this.modeChoix() === 'nouveau') {
        const v = this.formNouveauDossier.getRawValue();
        const dossier = await firstValueFrom(this.dossierService.creer({
          intitule: v.intitule!,
          sourceSignalementId: v.sourceSignalementId!,
          dateOuverture: (v.dateOuverture as Date).toISOString().substring(0, 10),
          descriptionContexte: v.descriptionContexte || undefined
        }));
        dossierId = dossier.id;

        // Ajouter l'implication de la personne dans ce nouveau dossier
        const imp = this.formImplication.getRawValue();
        const dateFinFormatee = imp.dateFin instanceof Date
          ? imp.dateFin.toISOString().substring(0, 10)
          : undefined;

        await firstValueFrom(this.dossierService.ajouterImplication(dossierId, {
          personneId: this.data.personneId,
          roleImplicationId: imp.roleImplicationId!,
          fonctionOccupee: imp.fonctionOccupee || undefined,
          entiteLibelleALEpoque: imp.entiteLibelleALEpoque || undefined,
          dateDebut: (imp.dateDebut as Date).toISOString().substring(0, 10),
          dateFin: dateFinFormatee,
          observations: imp.observations || undefined
        }));
      } else {
        // Mode 2 : dossier existant deja avec la personne dedans
        dossierId = this.formDossierExistant.value.dossierId!;
      }

      // Ajouter le fait au dossier
      const fait = this.formFait.getRawValue();
      await firstValueFrom(this.dossierService.ajouterFait(dossierId, {
        typeInfractionId: fait.typeInfractionId!,
        zoneGeographiqueId: fait.zoneGeographiqueId || undefined,
        dateFaits: (fait.dateFaits as Date).toISOString().substring(0, 10),
        lieuPrecis: fait.lieuPrecis || undefined,
        description: fait.description!,
        montantPrejudice: fait.montantPrejudice!,
        devise: fait.devise!
      }));

      this.toastr.success('Fait ajoute au dossier');
      this.dialogRef.close({ dossierId, cree: true });
    } catch (err) {
      this.toastr.error(messageErreurHttp(err, "Échec de l'opération"));
      this.enCoursCreation.set(false);
    }
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
