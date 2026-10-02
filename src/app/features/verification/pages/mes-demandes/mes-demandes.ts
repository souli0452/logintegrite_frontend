import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { ChargementListe } from '../../../../shared/ui/chargement-liste/chargement-liste';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { VerificationService } from '../../verification.service';
import { DemandeExport } from '../../verification.models';

/** Suivi, pour un consultant, de ses demandes d'export de dossier complet. */
@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, ChargementListe, EmptyState, PageHeader],
  templateUrl: './mes-demandes.html',
  styleUrl: './mes-demandes.scss'
})
export class MesDemandes {
  private readonly service = inject(VerificationService);

  protected readonly demandes = signal<DemandeExport[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal(false);

  constructor() {
    this.service.mesDemandes().subscribe({
      next: (l) => { this.demandes.set(l); this.chargement.set(false); },
      error: () => { this.erreur.set(true); this.chargement.set(false); }
    });
  }

  protected libelle(s: string): string {
    return ({ EN_ATTENTE: 'En attente', ACCORDEE: 'Accordée', REFUSEE: 'Refusée' } as Record<string, string>)[s] ?? s;
  }
}
