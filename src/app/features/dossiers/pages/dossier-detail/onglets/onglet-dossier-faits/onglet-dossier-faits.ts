import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

import { StatusBadge, StatusType } from '../../../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { FaitReprocheResponse } from '../../../../models/dossier.models';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-onglet-dossier-faits',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatTableModule, MatButtonModule, StatusBadge, EmptyState],
  templateUrl: './onglet-dossier-faits.html',
  styleUrl: './onglet-dossier-faits.scss'
})
export class OngletDossierFaits {
  readonly faits = input.required<FaitReprocheResponse[]>();
  /** Vrai pour un agent ou un administrateur sur un dossier ouvert : un fait rejete peut etre represente au validateur. */
  readonly peutReprendre = input(false);
  readonly reprendre = output<FaitReprocheResponse>();
  readonly colonnes = computed(() => {
    const base = ['dateFaits', 'infraction', 'description', 'montant', 'zone', 'statut'];
    return this.peutReprendre() && this.faits().some((f) => f.statutValidation === 'REJETEE') ? [...base, 'actions'] : base;
  });

  typeStatut(statut: string): StatusType {
    if (statut === 'VALIDEE') return 'success';
    if (statut === 'REJETEE') return 'danger';
    return 'warning';
  }
}
