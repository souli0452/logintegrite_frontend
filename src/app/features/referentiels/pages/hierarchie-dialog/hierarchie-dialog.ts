import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

// Element generique d'une hierarchie (Zone ou Entite)
export interface ItemHierarchique {
  id: string;
  libelle: string;
  niveau: string;
  parentId?: string;
}

export interface HierarchieDialogData {
  titre: string;                       // "zone geographique" ou "entite d'organisation"
  edition: ItemHierarchique | null;
  niveaux: { valeur: string; libelle: string }[];  // les niveaux possibles
  parentsPossibles: ItemHierarchique[];           // liste plate des parents candidats
}

@Component({
  selector: 'app-hierarchie-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './hierarchie-dialog.html',
  styleUrl: './hierarchie-dialog.scss'
})
export class HierarchieDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<HierarchieDialog>);
  readonly data = inject<HierarchieDialogData>(MAT_DIALOG_DATA);

  readonly formulaire = this.fb.group({
    libelle: [this.data.edition?.libelle ?? '', [Validators.required, Validators.maxLength(100)]],
    niveau: [this.data.edition?.niveau ?? this.data.niveaux[0].valeur, Validators.required],
    parentId: [this.data.edition?.parentId ?? '']
  });

  soumettre(): void {
    if (this.formulaire.invalid) return;
    const v = this.formulaire.getRawValue();
    this.dialogRef.close({
      libelle: v.libelle!,
      niveau: v.niveau!,
      parentId: v.parentId || undefined
    });
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
