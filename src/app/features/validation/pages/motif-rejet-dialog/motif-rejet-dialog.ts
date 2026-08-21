import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-motif-rejet-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './motif-rejet-dialog.html',
  styleUrl: './motif-rejet-dialog.scss'
})
export class MotifRejetDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MotifRejetDialog>);

  readonly formulaire = this.fb.group({
    motif: ['', [Validators.required, Validators.minLength(5)]]
  });

  soumettre(): void {
    if (this.formulaire.invalid) return;
    this.dialogRef.close(this.formulaire.value.motif);
  }

  annuler(): void {
    this.dialogRef.close();
  }
}
