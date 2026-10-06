import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideFrenchDateAdapter } from '../../../../core/i18n/french-date-adapter';
import { versIso } from '../../../../core/i18n/dates-iso';
import { LucideAngularModule, Search, Building2, User } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { VerificationService } from '../../verification.service';
import { CriteresVerification, ResultatVerification } from '../../verification.models';

type Mode = 'IDENTITE' | 'NUMERO';
type TypeNumero = 'numeroPiece' | 'rccm' | 'ifu' | 'numeroPersonne';

/**
 * Verification d'UNE personne precise. Il n'existe volontairement aucune liste a parcourir :
 * il faut identifier la personne (identite complete, ou un numero qui lui est propre).
 */
@Component({
  selector: 'app-verification-recherche',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    LucideAngularModule, PageHeader
  ],
  providers: [provideFrenchDateAdapter()],
  templateUrl: './verification-recherche.html',
  styleUrl: './verification-recherche.scss'
})
export class VerificationRecherche {
  private readonly service = inject(VerificationService);
  private readonly router = inject(Router);

  protected readonly icons = { Search, Building2, User };

  protected readonly mode = signal<Mode>('IDENTITE');
  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  /** null = aucune recherche faite ; [] = recherche faite sans resultat. */
  protected readonly resultats = signal<ResultatVerification[] | null>(null);

  protected readonly typesNumero: { valeur: TypeNumero; libelle: string }[] = [
    { valeur: 'numeroPiece', libelle: "Numéro de pièce d'identité (CNIB, passeport, NIP…)" },
    { valeur: 'rccm', libelle: 'RCCM (entreprise)' },
    { valeur: 'ifu', libelle: 'IFU (entreprise)' },
    { valeur: 'numeroPersonne', libelle: 'Numéro de personne (PERS-… ou ORG-…)' },
  ];

  protected readonly identite = new FormGroup({
    nom: new FormControl('', { nonNullable: true }),
    prenoms: new FormControl('', { nonNullable: true }),
    dateNaissance: new FormControl<Date | null>(null),
  });

  protected readonly numero = new FormGroup({
    type: new FormControl<TypeNumero>('numeroPiece', { nonNullable: true }),
    valeur: new FormControl('', { nonNullable: true }),
  });

  protected changerMode(m: Mode): void {
    this.mode.set(m);
    this.erreur.set(null);
    this.resultats.set(null);
  }

  protected peutVerifier(): boolean {
    if (this.mode() === 'IDENTITE') {
      const v = this.identite.getRawValue();
      return v.nom.trim().length >= 2 && v.prenoms.trim().length >= 2 && !!v.dateNaissance;
    }
    return this.numero.getRawValue().valeur.trim().length >= 4;
  }

  protected verifier(): void {
    if (!this.peutVerifier() || this.enCours()) return;
    const criteres: CriteresVerification = this.mode() === 'IDENTITE'
      ? { ...this.identite.getRawValue(), dateNaissance: versIso(this.identite.getRawValue().dateNaissance) }
      : { [this.numero.getRawValue().type]: this.numero.getRawValue().valeur };

    this.enCours.set(true);
    this.erreur.set(null);
    this.service.rechercher(criteres).subscribe({
      next: (liste) => { this.resultats.set(liste); this.enCours.set(false); },
      error: (e: HttpErrorResponse) => {
        this.resultats.set(null);
        this.erreur.set(this.message(e));
        this.enCours.set(false);
      }
    });
  }

  protected ouvrir(r: ResultatVerification): void {
    this.router.navigate(['/verification/personnes', r.id]);
  }

  private message(e: HttpErrorResponse): string {
    if (e.status === 429) return 'Trop de recherches en peu de temps. Réessayez dans quelques minutes.';
    return e.error?.detail ?? e.error?.message ?? "La vérification n'a pas pu aboutir. Réessayez.";
  }
}
