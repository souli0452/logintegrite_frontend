import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideFrenchDateAdapter } from '../../../core/i18n/french-date-adapter';
import { versIso } from '../../../core/i18n/dates-iso';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule, UserPlus, X, Info, Eye, EyeOff, LucideIconData
} from 'lucide-angular';

import {
  genererMotDePasseSecurise, MOT_DE_PASSE_CONSIGNE, validerMotDePasse
} from '../../../shared/utils/mot-de-passe.util';
import { UtilisateurService } from '../services/utilisateur.service';
import { RoleHabilitationResponse, CodeRole } from '../models/utilisateur.models';

interface DialogData {
  rolesDisponibles: RoleHabilitationResponse[];
}

@Component({
  selector: 'app-creer-utilisateur-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatDatepickerModule,
    LucideAngularModule
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './creer-utilisateur-dialog.html',
  styleUrl: './creer-utilisateur-dialog.scss'
})
export class CreerUtilisateurDialog {
  private readonly ref = inject(MatDialogRef<CreerUtilisateurDialog>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);

  readonly icons: Record<string, LucideIconData> = { UserPlus, X, Info, Eye, EyeOff };

  readonly enCours = signal(false);
  readonly afficherMotDePasse = signal(false);
  readonly consigneMotDePasse = MOT_DE_PASSE_CONSIGNE;

  readonly formulaire = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    motDePasseTemporaire: ['', [Validators.required, validerMotDePasse]],
    roleInitial: ['' as CodeRole | '', Validators.required],
    dateExpiration: [null as Date | null]
  });

  /** Aujourd'hui, au format AAAA-MM-JJ (date minimale du champ). */
  readonly aujourdhui = new Date();
  readonly consultation = signal(false);

  constructor() {
    // Un compte de consultation expire toujours : on propose 6 mois, modifiables.
    this.formulaire.controls.roleInitial.valueChanges.subscribe((role) => {
      const estConsultation = role === 'CONSULTANT';
      this.consultation.set(estConsultation);
      const champ = this.formulaire.controls.dateExpiration;
      if (estConsultation && !champ.value) {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        champ.setValue(d);
      }
    });
  }

  basculerVisibiliteMDP(): void {
    this.afficherMotDePasse.update(v => !v);
  }

  genererMotDePasse(): void {
    this.formulaire.patchValue({ motDePasseTemporaire: genererMotDePasseSecurise() });
    this.afficherMotDePasse.set(true);
  }

  copierMotDePasse(): void {
    const mdp = this.formulaire.value.motDePasseTemporaire;
    if (mdp) {
      navigator.clipboard.writeText(mdp).then(
        () => this.toastr.success('Mot de passe copié'),
        () => this.toastr.error('Copie impossible')
      );
    }
  }

  soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const v = this.formulaire.getRawValue();
    if (v.roleInitial === 'CONSULTANT' && !v.dateExpiration) {
      this.formulaire.controls.dateExpiration.setErrors({ required: true });
      this.formulaire.controls.dateExpiration.markAsTouched();
      return;
    }
    this.enCours.set(true);

    this.utilisateurService.creer({
      nom: v.nom!,
      prenom: v.prenom!,
      email: v.email!,
      telephone: v.telephone || undefined,
      motDePasseTemporaire: v.motDePasseTemporaire!,
      roleInitial: v.roleInitial as CodeRole,
      dateExpiration: versIso(v.dateExpiration) || undefined
    }).subscribe({
      next: (cree) => {
        this.enCours.set(false);
        this.ref.close(cree);
      },
      error: (err) => {
        this.enCours.set(false);
        const message = err?.error?.message
          ?? err?.error?.detail
          ?? 'Impossible de créer l\'utilisateur';
        this.toastr.error(message);
      }
    });
  }

  annuler(): void {
    this.ref.close();
  }
}
