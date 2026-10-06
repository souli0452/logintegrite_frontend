import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideFrenchDateAdapter } from '../../../core/i18n/french-date-adapter';
import { depuisIso, versIso } from '../../../core/i18n/dates-iso';

export interface DialogDateData {
  titre: string;
  message?: string;
  label: string;
  /** Date actuelle (AAAA-MM-JJ), ou null. */
  valeur: string | null;
  /** Date minimale acceptee (AAAA-MM-JJ). */
  minimum: string;
  /** Propose « Retirer la date » (sinon la date est obligatoire). */
  peutRetirer: boolean;
}

/** Resultat : { date } avec une date AAAA-MM-JJ, ou null pour retirer. `undefined` si l'on annule. */
export interface DialogDateResultat { date: string | null }

/** Choix d'une date (expiration d'un compte). */
@Component({
  selector: 'app-dialog-date',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [provideFrenchDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.titre }}</h2>
    <mat-dialog-content>
      @if (data.message) { <p class="message">{{ data.message }}</p> }
      <mat-form-field appearance="outline" class="champ">
        <mat-label>{{ data.label }}</mat-label>
        <input matInput [matDatepicker]="pDate" [formControl]="date" [min]="minimum" placeholder="jj/mm/aaaa" cdkFocusInitial>
        <mat-datepicker-toggle matIconSuffix [for]="pDate"></mat-datepicker-toggle>
        <mat-datepicker #pDate></mat-datepicker>
        @if (date.invalid && date.touched) { <mat-error>Choisissez une date à partir d'aujourd'hui.</mat-error> }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.peutRetirer && data.valeur) {
        <button mat-button type="button" class="retirer" (click)="retirer()">Retirer la date</button>
      }
      <button mat-stroked-button type="button" (click)="annuler()">Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="date.invalid" (click)="valider()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .message { margin: 0 0 12px; color: var(--text-secondary); font-size: var(--text-sm); max-width: 46ch; }
    .champ { width: 100%; min-width: min(320px, 80vw); }
    .retirer { margin-right: auto; }
  `]
})
export class DialogDate {
  protected readonly data = inject<DialogDateData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DialogDate, DialogDateResultat>);

  protected readonly minimum = depuisIso(this.data.minimum);
  protected readonly date = new FormControl<Date | null>(depuisIso(this.data.valeur), {
    validators: [Validators.required, (c) => (c.value && this.minimum && c.value < this.minimum ? { passe: true } : null)]
  });

  protected annuler(): void { this.ref.close(); }
  protected retirer(): void { this.ref.close({ date: null }); }

  protected valider(): void {
    this.date.markAsTouched();
    if (this.date.valid) this.ref.close({ date: versIso(this.date.value) });
  }
}
