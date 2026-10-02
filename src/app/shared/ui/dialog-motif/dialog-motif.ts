import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface DialogMotifData {
  titre: string;
  message?: string;
  label: string;
  bouton: string;
  minimum: number;
  maximum?: number;
}

/** Saisie d'un texte obligatoire (motif d'une demande, raison d'un refus). Ferme avec le texte, ou sans rien si on annule. */
@Component({
  selector: 'app-dialog-motif',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.titre }}</h2>
    <mat-dialog-content>
      @if (data.message) { <p class="message">{{ data.message }}</p> }
      <mat-form-field appearance="outline" class="champ">
        <mat-label>{{ data.label }}</mat-label>
        <textarea matInput rows="5" [formControl]="texte" [attr.maxlength]="data.maximum ?? 1000" cdkFocusInitial></textarea>
        <mat-hint align="end">{{ texte.value.length }} / {{ data.maximum ?? 1000 }} (minimum {{ data.minimum }})</mat-hint>
        @if (texte.invalid && texte.touched) {
          <mat-error>Au moins {{ data.minimum }} caractères.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="annuler()">Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="texte.invalid" (click)="valider()">{{ data.bouton }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .message { margin: 0 0 12px; color: var(--text-secondary); font-size: var(--text-sm); }
    .champ { width: 100%; min-width: min(480px, 80vw); }
  `]
})
export class DialogMotif {
  protected readonly data = inject<DialogMotifData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DialogMotif, string>);

  protected readonly texte = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(this.data.minimum)]
  });

  protected annuler(): void { this.ref.close(); }

  protected valider(): void {
    this.texte.markAsTouched();
    if (this.texte.valid) this.ref.close(this.texte.value.trim());
  }
}
