import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';

import { DossierService } from '../../../services/dossier.service';
import { DossierResponse } from '../../../models/dossier.models';
import { SourceSignalementService } from '../../../../referentiels/services/source-signalement.service';
import { SourceSignalementResponse } from '../../../../referentiels/models/referentiel.models';

/** Modification de l'intitule, de la source de signalement et du contexte d'un dossier OUVERT. */
@Component({
  selector: 'app-modifier-dossier-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Modifier le dossier</h2>
    <mat-dialog-content>
      <p class="numero">{{ dossier.numeroDossier }}</p>
      <form [formGroup]="formulaire" class="formulaire">
        <mat-form-field appearance="outline">
          <mat-label>Intitulé</mat-label>
          <input matInput formControlName="intitule" maxlength="255" required>
          @if (formulaire.controls.intitule.hasError('required') && formulaire.controls.intitule.touched) {
            <mat-error>L'intitulé est obligatoire.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Source de signalement</mat-label>
          <mat-select formControlName="sourceSignalementId" required>
            @for (s of sources(); track s.id) {
              <mat-option [value]="s.id">{{ s.libelle }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contexte</mat-label>
          <textarea matInput rows="5" formControlName="descriptionContexte" maxlength="5000"></textarea>
          <mat-hint align="end">{{ formulaire.controls.descriptionContexte.value.length }} / 5000</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="annuler()">Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="formulaire.invalid || enCours()" (click)="enregistrer()">
        {{ enCours() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .numero { margin: 0 0 12px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: var(--text-xs); color: var(--text-secondary); }
    .formulaire { display: grid; gap: 4px; min-width: min(520px, 80vw); }
  `]
})
export class ModifierDossierDialog {
  protected readonly dossier = inject<DossierResponse>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ModifierDossierDialog, DossierResponse>);
  private readonly service = inject(DossierService);
  private readonly sourceService = inject(SourceSignalementService);
  private readonly toastr = inject(ToastrService);

  protected readonly sources = signal<SourceSignalementResponse[]>([]);
  protected readonly enCours = signal(false);

  protected readonly formulaire = new FormGroup({
    intitule: new FormControl(this.dossier.intitule ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    sourceSignalementId: new FormControl(this.dossier.sourceSignalementId, { nonNullable: true, validators: [Validators.required] }),
    descriptionContexte: new FormControl(this.dossier.descriptionContexte ?? '', { nonNullable: true, validators: [Validators.maxLength(5000)] }),
  });

  constructor() {
    this.sourceService.lister().subscribe({ next: (l) => this.sources.set(l), error: () => {} });
  }

  protected annuler(): void { this.ref.close(); }

  protected enregistrer(): void {
    if (this.formulaire.invalid) { this.formulaire.markAllAsTouched(); return; }
    const v = this.formulaire.getRawValue();
    this.enCours.set(true);
    this.service.modifier(this.dossier.id, {
      intitule: v.intitule.trim(),
      sourceSignalementId: v.sourceSignalementId,
      descriptionContexte: v.descriptionContexte.trim() || undefined,
      dateOuverture: this.dossier.dateOuverture
    }).subscribe({
      next: (maj) => { this.toastr.success('Dossier modifié'); this.ref.close(maj); },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        this.toastr.error(e.error?.detail ?? e.error?.message ?? 'Modification impossible');
      }
    });
  }
}
