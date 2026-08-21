import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';

export interface ReferentielSimpleDialogData {
  titre: string;
  edition: { id: string; libelle: string; actif?: boolean } | null;
  avecActif: boolean;  // true si le referentiel a un champ 'actif'
}

@Component({
  selector: 'app-referentiel-simple-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatButtonModule
  ],
  templateUrl: './referentiel-simple-dialog.html',
  styleUrl: './referentiel-simple-dialog.scss'
})
export class ReferentielSimpleDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ReferentielSimpleDialog>);
  readonly data = inject<ReferentielSimpleDialogData>(MAT_DIALOG_DATA);

  readonly formulaire = this.fb.group({
    libelle: [this.data.edition?.libelle ?? '', [Validators.required, Validators.maxLength(100)]],
    actif: [this.data.edition?.actif ?? true]
  });

  soumettre(): void {
    if (this.formulaire.invalid) return;
    const v = this.formulaire.getRawValue();
    const resultat = this.data.avecActif
      ? { libelle: v.libelle!, actif: v.actif! }
      : { libelle: v.libelle! };
    this.dialogRef.close(resultat);
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
