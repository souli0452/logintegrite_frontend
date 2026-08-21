import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-categorie-infraction-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './categorie-infraction-form-dialog.html',
  styleUrl: './categorie-infraction-form-dialog.scss'
})
export class CategorieInfractionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategorieInfractionFormDialog>);
  readonly data = inject(MAT_DIALOG_DATA, { optional: true });

  // Permet au HTML de savoir si on est en création (false) ou en modification (true)
  readonly enEdition = !!this.data;

  // Initialisation du formulaire avec les données existantes (si modification) ou à vide (si création)
  readonly formulaire = this.fb.group({
    libelle: [this.data?.libelle ?? '', [Validators.required]],
    description: [this.data?.description ?? '']
  });

  soumettre(): void {
    if (this.formulaire.valid) {
      // Renvoie les données saisies au composant parent qui a ouvert la modale
      this.dialogRef.close(this.formulaire.value);
    }
  }

  annuler(): void {
    // Ferme la modale sans rien renvoyer
    this.dialogRef.close();
  }
}
