import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule, IdCard, X, Save, Info, LucideIconData } from 'lucide-angular';

import {
  TypePieceIdentiteRequest,
  TypePieceIdentiteResponse
} from '../../../models/referentiel.models';

export interface DonneesTypePieceIdentiteDialog {
  mode: 'creation' | 'modification';
  typePiece?: TypePieceIdentiteResponse;
}

@Component({
  selector: 'app-type-piece-identite-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    LucideAngularModule
  ],
  templateUrl: './type-piece-identite-form-dialog.html',
  styleUrl: './type-piece-identite-form-dialog.scss'
})
export class TypePieceIdentiteFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TypePieceIdentiteFormDialog, TypePieceIdentiteRequest>);
  readonly data = inject<DonneesTypePieceIdentiteDialog>(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = { IdCard, X, Save, Info };

  readonly estCreation = computed(() => this.data.mode === 'creation');

  readonly form = this.fb.group({
    code: [
      { value: this.data.typePiece?.code ?? '', disabled: !this.estCreation() },
      [Validators.required, Validators.pattern(/^[A-Z_]+$/), Validators.maxLength(30)]
    ],
    libelle: [
      this.data.typePiece?.libelle ?? '',
      [Validators.required, Validators.maxLength(150)]
    ],
    actif: [this.data.typePiece?.actif ?? true]
  });

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: TypePieceIdentiteRequest = {
      code: (v.code ?? '').toUpperCase().trim(),
      libelle: (v.libelle ?? '').trim(),
      actif: v.actif ?? true
    };
    this.dialogRef.close(request);
  }

  annuler(): void {
    this.dialogRef.close(undefined);
  }
}
