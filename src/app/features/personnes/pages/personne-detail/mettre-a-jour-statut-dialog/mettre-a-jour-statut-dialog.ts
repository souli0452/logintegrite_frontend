import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule, Scale, X, Save, Info, AlertCircle,
  LucideIconData
} from 'lucide-angular';

import { StatutJudiciaireService } from '../../../../referentiels/services/statut-judiciaire.service';
import { StatutJudiciaireResponse } from '../../../../referentiels/models/referentiel.models';
import { ImplicationService } from '../../../services/implication.service';
import { MiseAJourStatutJudiciaireRequest } from '../../../../dossiers/models/dossier.models';

import { provideFrenchDateAdapter } from '../../../../../core/i18n/french-date-adapter';

/**
 * Données passées au dialog par le parent.
 * L'ID pointe sur la LIAISON implication-fait, pas sur l'implication brute.
 */
export interface DonneesDialogStatut {
  implicationFaitId: string;
  personneNomAffichage: string;
  faitLibelle?: string;
  dossierIntitule?: string;
  numeroDossier?: string;
  statutActuelLibelle?: string;
}

@Component({
  selector: 'app-mettre-a-jour-statut-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule,
    LucideAngularModule
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './mettre-a-jour-statut-dialog.html',
  styleUrl: './mettre-a-jour-statut-dialog.scss'
})
export class MettreAJourStatutDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MettreAJourStatutDialog, boolean>);
  readonly data = inject<DonneesDialogStatut>(MAT_DIALOG_DATA);
  private readonly statutService = inject(StatutJudiciaireService);
  private readonly implicationService = inject(ImplicationService);
  private readonly toastr = inject(ToastrService);

  readonly icons: Record<string, LucideIconData> = { Scale, X, Save, Info, AlertCircle };

  readonly statuts = signal<StatutJudiciaireResponse[]>([]);
  readonly chargementStatuts = signal(false);
  readonly enregistrement = signal(false);

  readonly form = this.fb.group({
    statutJudiciaireId: ['', Validators.required],
    dateStatut: [new Date(), Validators.required],
    autoriteCompetente: [''],
    referenceAffaire: [''],
    motif: ['']
  });

  ngOnInit(): void {
    this.chargerStatuts();
  }

  private chargerStatuts(): void {
    this.chargementStatuts.set(true);
    this.statutService.lister().subscribe({
      next: (liste) => {
        this.statuts.set(liste.filter(s => s.actif !== false));
        this.chargementStatuts.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger la liste des statuts');
        this.chargementStatuts.set(false);
      }
    });
  }

  fermer(): void {
    this.dialogRef.close(false);
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload: MiseAJourStatutJudiciaireRequest = {
      statutJudiciaireId: v.statutJudiciaireId!,
      dateStatut: this.toIsoDate(v.dateStatut!),
      autoriteCompetente: v.autoriteCompetente || undefined,
      referenceAffaire: v.referenceAffaire || undefined,
      motif: v.motif || undefined
    };

    this.enregistrement.set(true);
    this.implicationService.mettreAJourStatut(this.data.implicationFaitId, payload).subscribe({
      next: () => {
        this.toastr.success('Statut judiciaire mis à jour');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.enregistrement.set(false);
        console.error('Erreur MAJ statut', err);
        this.toastr.error('Impossible de mettre à jour le statut');
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
