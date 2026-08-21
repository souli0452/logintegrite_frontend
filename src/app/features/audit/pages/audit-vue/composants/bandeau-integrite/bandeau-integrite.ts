import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  ShieldCheck,
  ShieldAlert,
  Copy,
  RefreshCw,
  Hash,
  Users,
  Layers,
  Clock,
  LucideIconData
} from 'lucide-angular';

import { EtatChaineResponse, VerificationChaineResponse } from '../../../../models/audit.models';

/**
 * Bandeau d'intégrité cryptographique — pièce maîtresse du haut d'écran.
 *
 * Rôles :
 *   - Afficher l'état courant de la chaîne (total, dernier hash, plage temporelle)
 *   - Statut visuel : intègre (vert) / non vérifiée (neutre) / rompue (rouge)
 *   - Déclencher la vérification cryptographique complète
 *   - Copie du dernier hash dans le presse-papier
 */
@Component({
  selector: 'app-bandeau-integrite',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, LucideAngularModule],
  templateUrl: './bandeau-integrite.html',
  styleUrl: './bandeau-integrite.scss'
})
export class BandeauIntegrite {
  private readonly snack = inject(MatSnackBar);

  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly etat = input<EtatChaineResponse | null>(null);
  readonly verification = input<VerificationChaineResponse | null>(null);
  readonly chargementEtat = input<boolean>(false);
  readonly verificationEnCours = input<boolean>(false);

  // ─── Sorties ───────────────────────────────────────────────────────────────
  readonly verifier = output<void>();
  readonly rafraichir = output<void>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    ShieldCheck, ShieldAlert, Copy, RefreshCw, Hash, Users, Layers, Clock
  };

  // ─── Statut synthétique de la chaîne ───────────────────────────────────────
  readonly statut = computed<'intacte' | 'rompue' | 'non-verifiee'>(() => {
    const v = this.verification();
    if (!v) return 'non-verifiee';
    return v.chaineIntegre ? 'intacte' : 'rompue';
  });

  readonly libelleStatut = computed(() => {
    switch (this.statut()) {
      case 'intacte':      return 'Chaîne intègre';
      case 'rompue':       return 'Rupture détectée';
      case 'non-verifiee': return 'Chaîne non vérifiée';
    }
  });

  readonly hashCourt = computed(() => {
    const h = this.etat()?.dernierHash;
    return h ? h.substring(0, 16) : '—';
  });

  // ─── Actions ───────────────────────────────────────────────────────────────
  async copierHash(): Promise<void> {
    const hash = this.etat()?.dernierHash;
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      this.snack.open('Hash copié dans le presse-papier', 'Fermer', {
        duration: 2500,
        panelClass: 'toast-succes'
      });
    } catch {
      this.snack.open('Impossible de copier le hash', 'Fermer', {
        duration: 3000,
        panelClass: 'toast-erreur'
      });
    }
  }

  declencherVerification(): void {
    this.verifier.emit();
  }

  declencherRafraichissement(): void {
    this.rafraichir.emit();
  }
}
