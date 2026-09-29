import { Component, computed, inject, input, output, signal, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule, Gavel, Scale, Calendar, FolderOpen, LucideIconData } from 'lucide-angular';
import { forkJoin, of } from 'rxjs';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../../../shared/ui/status-badge/status-badge';
import { ImplicationFaitResume } from '../../../../models/personne.models';
import { PeineService } from '../../../../services/peine.service';
import { PeineResponse, TypePeine } from '../../../../models/peine.models';

interface PeineAvecContexte extends PeineResponse {
  contexte: ImplicationFaitResume;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-onglet-peines',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe,
    MatProgressSpinnerModule, LucideAngularModule,
    EmptyState
  ],
  templateUrl: './onglet-peines.html',
  styleUrl: './onglet-peines.scss'
})
export class OngletPeines implements OnChanges {
  private readonly peineService = inject(PeineService);

  readonly implicationFaits = input.required<ImplicationFaitResume[]>();

  readonly chargement = signal(true);
  readonly peines = signal<PeineAvecContexte[]>([]);
  readonly nombreChange = output<number>();

  readonly icons: Record<string, LucideIconData> = { Gavel, Scale, Calendar, FolderOpen };

  readonly totalPeines = computed(() => this.peines().length);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['implicationFaits']) {
      this.charger();
    }
  }

  private charger(): void {
    const liaisons = this.implicationFaits();
    if (liaisons.length === 0) {
      this.peines.set([]);
      this.nombreChange.emit(0);
      this.chargement.set(false);
      return;
    }

    this.chargement.set(true);

    // Un appel par liaison implicationFait
    const appels = liaisons.map((liaison) =>
      this.peineService.lister(liaison.id)
    );

    forkJoin(appels).subscribe({
      next: (resultats) => {
        const peinesEnrichies: PeineAvecContexte[] = [];
        resultats.forEach((peinesGroupe, index) => {
          const liaison = liaisons[index];
          peinesGroupe.forEach((peine) => {
            peinesEnrichies.push({ ...peine, contexte: liaison });
          });
        });
        // Tri par date décision descendante (les plus récentes en premier)
        peinesEnrichies.sort((a, b) => {
          const dateA = a.dateDecision ?? '';
          const dateB = b.dateDecision ?? '';
          return dateB.localeCompare(dateA);
        });
        this.peines.set(peinesEnrichies);
        this.nombreChange.emit(peinesEnrichies.length);
        this.chargement.set(false);
      },
      error: () => {
        this.peines.set([]);
        this.nombreChange.emit(0);
        this.chargement.set(false);
      }
    });
  }

  libelleType(type: TypePeine): string {
    switch (type) {
      case 'PRISON':       return 'Peine de prison';
      case 'AMENDE':       return 'Amende';
      case 'CONFISCATION': return 'Confiscation de biens';
      case 'RADIATION':    return 'Radiation';
      case 'AUTRE':        return 'Autre';
      default:             return type;
    }
  }
}
