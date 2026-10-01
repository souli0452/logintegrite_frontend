import { Component, inject, signal } from '@angular/core';
import { ChargementListe } from '../../../../../../shared/ui/chargement-liste/chargement-liste';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { AuditService } from '../../../../services/audit.service';
import { EvenementConnexion } from '../../../../models/audit.models';

const TAILLE = 25;

/** Qui s'est connecté, quand, depuis quelle adresse, et quelles tentatives ont échoué (source : Keycloak). */
@Component({
  selector: 'app-onglet-audit-connexions',
  standalone: true,
  imports: [ChargementListe, DatePipe, MatTableModule, MatFormFieldModule, MatSelectModule, MatButtonModule, EmptyState],
  templateUrl: './onglet-audit-connexions.html',
  styleUrl: '../onglet-audit-consultations/onglet-audit-consultations.scss'
})
export class OngletAuditConnexions {
  private readonly service = inject(AuditService);
  private readonly toastr = inject(ToastrService);

  readonly entries = signal<EvenementConnexion[]>([]);
  readonly chargement = signal(true);
  readonly page = signal(0);
  readonly encore = signal(false);
  readonly filtre = signal('');
  readonly colonnes = ['date', 'type', 'utilisateur', 'adresseIp', 'motif'];
  readonly types = [
    { valeur: '', libelle: 'Tous les événements' },
    { valeur: 'LOGIN', libelle: 'Connexions' },
    { valeur: 'LOGOUT', libelle: 'Déconnexions' },
    { valeur: 'LOGIN_ERROR', libelle: 'Échecs de connexion' },
  ];

  constructor() { this.charger(); }

  libelleType(t: string): string {
    return ({ LOGIN: 'Connexion', LOGOUT: 'Déconnexion', LOGIN_ERROR: 'Échec de connexion' } as Record<string, string>)[t] ?? t;
  }

  libelleMotif(m: string | null): string {
    if (!m) return '—';
    const d: Record<string, string> = {
      invalid_user_credentials: 'Mot de passe incorrect',
      user_not_found: 'Compte inconnu',
      user_disabled: 'Compte désactivé',
      user_temporarily_disabled: 'Compte bloqué temporairement',
    };
    return d[m] ?? m;
  }

  charger(): void {
    this.chargement.set(true);
    this.service.listerConnexions(this.page(), TAILLE, this.filtre() || undefined).subscribe({
      next: (liste) => { this.entries.set(liste); this.encore.set(liste.length === TAILLE); this.chargement.set(false); },
      error: () => { this.toastr.error('Impossible de lire les connexions dans Keycloak'); this.chargement.set(false); }
    });
  }

  changerFiltre(v: string): void { this.filtre.set(v); this.page.set(0); this.charger(); }
  precedent(): void { if (this.page() > 0) { this.page.update((p) => p - 1); this.charger(); } }
  suivant(): void { if (this.encore()) { this.page.update((p) => p + 1); this.charger(); } }
}
