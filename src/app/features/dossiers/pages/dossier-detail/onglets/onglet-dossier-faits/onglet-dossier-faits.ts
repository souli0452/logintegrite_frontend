import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

import { StatusBadge, StatusType } from '../../../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { FaitReprocheResponse } from '../../../../models/dossier.models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-onglet-dossier-faits',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatTableModule, StatusBadge, EmptyState],
  templateUrl: './onglet-dossier-faits.html',
  styleUrl: './onglet-dossier-faits.scss'
})
export class OngletDossierFaits {
  readonly faits = input.required<FaitReprocheResponse[]>();
  readonly colonnes = ['dateFaits', 'infraction', 'description', 'montant', 'zone', 'statut'];

  typeStatut(statut: string): StatusType {
    if (statut === 'VALIDEE') return 'success';
    if (statut === 'REJETEE') return 'danger';
    return 'warning';
  }
}
