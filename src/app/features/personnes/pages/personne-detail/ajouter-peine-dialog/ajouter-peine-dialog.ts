import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Gavel, X, LucideIconData } from 'lucide-angular';

import { PeineService } from '../../../services/peine.service';
import { PeineRequest, TypePeine, NatureSanction } from '../../../models/peine.models';

interface DialogData {
  implicationFaitId: string;
  contexte?: {
    faitDescription?: string;
    typeInfraction?: string;
    numeroDossier?: string;
    personneNom?: string;
  };
}

@Component({
  selector: 'app-ajouter-peine-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatProgressSpinnerModule,
    LucideAngularModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ajouter-peine-dialog.html',
  styleUrl: './ajouter-peine-dialog.scss'
})
export class AjouterPeineDialog {
  private readonly ref = inject(MatDialogRef<AjouterPeineDialog>);
  private readonly peineService = inject(PeineService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = { Gavel, X };
  readonly enCours = signal(false);

  readonly typesPeine: { valeur: TypePeine; libelle: string }[] = [
    { valeur: 'PRISON',       libelle: 'Peine de prison' },
    { valeur: 'AMENDE',       libelle: 'Amende' },
    { valeur: 'CONFISCATION', libelle: 'Confiscation de biens' },
    { valeur: 'RADIATION',    libelle: 'Radiation' },
    { valeur: 'AUTRE',        libelle: 'Autre' }
  ];

  readonly naturesSanction: { valeur: NatureSanction; libelle: string }[] = [
    { valeur: 'JUDICIAIRE',    libelle: 'Judiciaire' },
    { valeur: 'ADMINISTRATIVE', libelle: 'Administrative' }
  ];

  readonly formulaire = this.fb.group({
    typePeine: ['' as TypePeine | '', Validators.required],
    natureSanction: ['' as NatureSanction | ''],
    duree: [''],
    montantAmende: [null as number | null],
    dateDecision: [null as Date | null],
    dateExecution: [null as Date | null],
    description: ['']
  });

  soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    this.enCours.set(true);

    const request: PeineRequest = {
      typePeine: v.typePeine as TypePeine,
      natureSanction: v.natureSanction ? (v.natureSanction as NatureSanction) : undefined,
      duree: v.duree || undefined,
      montantAmende: v.montantAmende ?? undefined,
      dateDecision: this.formaterDate(v.dateDecision),
      dateExecution: this.formaterDate(v.dateExecution),
      description: v.description || undefined
    };

    this.peineService.creer(this.data.implicationFaitId, request).subscribe({
      next: (peine) => {
        this.toastr.success('Peine enregistrée');
        this.ref.close(peine);
      },
      error: (err) => {
        const msg = err?.error?.message ?? "Impossible d'enregistrer la peine";
        this.toastr.error(msg);
        this.enCours.set(false);
      }
    });
  }

  annuler(): void {
    this.ref.close();
  }

  private formaterDate(date: Date | null): string | undefined {
    if (!date) return undefined;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().substring(0, 10);
  }
}
