import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';

import { CategorieInfractionService } from '../../services/categorie-infraction.service';
import {
  TypeInfractionResponse,
  CategorieInfractionResponse
} from '../../models/referentiel.models';
import { TypeInfractionRequest } from '../../services/type-infraction.service';

@Component({
  selector: 'app-type-infraction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatButtonModule
  ],
  templateUrl: './type-infraction-dialog.html',
  styleUrl: './type-infraction-dialog.scss'
})
export class TypeInfractionDialog {
  private readonly fb = inject(FormBuilder);
  private readonly categorieService = inject(CategorieInfractionService);
  private readonly dialogRef = inject(MatDialogRef<TypeInfractionDialog>);
  readonly edition = inject<TypeInfractionResponse | null>(MAT_DIALOG_DATA);

  readonly categories = signal<CategorieInfractionResponse[]>([]);

  readonly formulaire = this.fb.group({
    libelle: [this.edition?.libelle ?? '', [Validators.required, Validators.maxLength(100)]],
    actif: [this.edition?.actif ?? true],
    categorieInfractionId: [this.edition?.categorieInfractionId ?? '', Validators.required]
  });

  constructor() {
    this.categorieService.lister().subscribe((cats) => this.categories.set(cats));
  }

  soumettre(): void {
    if (this.formulaire.invalid) return;
    this.dialogRef.close(this.formulaire.getRawValue() as TypeInfractionRequest);
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
