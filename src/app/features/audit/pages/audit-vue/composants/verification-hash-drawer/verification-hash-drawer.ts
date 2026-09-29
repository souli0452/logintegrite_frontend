import { Component, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Calendar,
  User,
  Package,
  LucideIconData
} from 'lucide-angular';

import { AuditForensiqueService } from '../../../../services/audit-forensique.service';
import { VerificationMaillonResponse } from '../../../../models/audit.models';

/**
 * Drawer latéral "Vérifier un hash" — permet à un auditeur de coller
 * un hash observé sur un rapport papier et de le vérifier cryptographiquement.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-verification-hash-drawer',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    LucideAngularModule
  ],
  templateUrl: './verification-hash-drawer.html',
  styleUrl: './verification-hash-drawer.scss'
})
export class VerificationHashDrawer {
  private readonly forensique = inject(AuditForensiqueService);
  private readonly snack = inject(MatSnackBar);

  readonly ouvert = input<boolean>(false);
  readonly fermer = output<void>();

  readonly hashSaisi = signal('');
  readonly enCours = signal(false);
  readonly resultat = signal<VerificationMaillonResponse | null>(null);
  readonly erreur = signal<string | null>(null);

  readonly icons: Record<string, LucideIconData> = {
    Search, X, ShieldCheck, ShieldAlert, Hash, Calendar, User, Package
  };

  onFermer(): void {
    this.hashSaisi.set('');
    this.resultat.set(null);
    this.erreur.set(null);
    this.fermer.emit();
  }

  verifier(): void {
    const hash = this.hashSaisi().trim();
    if (hash.length < 8) {
      this.erreur.set('Saisissez au moins 8 caractères hexadécimaux.');
      this.resultat.set(null);
      return;
    }
    if (!/^[0-9a-fA-F]+$/.test(hash)) {
      this.erreur.set('Le hash ne doit contenir que des caractères hexadécimaux (0-9, a-f).');
      this.resultat.set(null);
      return;
    }

    this.enCours.set(true);
    this.erreur.set(null);
    this.resultat.set(null);

    this.forensique.verifierMaillon(hash).subscribe({
      next: (res) => {
        this.resultat.set(res);
        this.enCours.set(false);
      },
      error: (err) => {
        this.enCours.set(false);
        if (err.status === 404) {
          this.erreur.set('Aucun maillon ne correspond à ce hash dans la chaîne d\'audit.');
        } else {
          this.erreur.set('Erreur lors de la vérification. Vérifiez le hash saisi ou réessayez.');
        }
      }
    });
  }

  async copier(valeur: string | null | undefined): Promise<void> {
    if (!valeur) return;
    try {
      await navigator.clipboard.writeText(valeur);
      this.snack.open('Copié', 'Fermer', { duration: 1500 });
    } catch { /* silencieux */ }
  }
}
