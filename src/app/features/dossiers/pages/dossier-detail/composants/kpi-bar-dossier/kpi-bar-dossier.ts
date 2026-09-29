import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  Users, FileText, TrendingUp, Paperclip,
  LucideIconData
} from 'lucide-angular';

import { FaitReprocheResponse } from '../../../../models/dossier.models';

/**
 * Barre horizontale de 4 KPI du dossier : personnes, faits, préjudice total, documents.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kpi-bar-dossier',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, LucideAngularModule],
  templateUrl: './kpi-bar-dossier.html',
  styleUrl: './kpi-bar-dossier.scss'
})
export class KpiBarDossier {
  readonly nbPersonnes = input<number>(0);
  readonly nbFaits = input<number>(0);
  readonly faits = input<FaitReprocheResponse[]>([]);
  readonly nbDocuments = input<number>(0);

  readonly naviguer = output<number>();

  readonly icons: Record<string, LucideIconData> = {
    Users, FileText, TrendingUp, Paperclip
  };

  /** Préjudice total agrégé sur tous les faits validés. */
  readonly prejudiceTotal = computed(() => {
    return this.faits().reduce((somme, f) => {
      if (f.statutValidation !== 'VALIDEE') return somme;
      return somme + (Number(f.montantPrejudice) || 0);
    }, 0);
  });

  /** Devise majoritaire (utilisée pour l'affichage). */
  readonly deviseMajoritaire = computed(() => {
    const faits = this.faits().filter(f => f.statutValidation === 'VALIDEE');
    if (faits.length === 0) return 'XOF';
    const compte = new Map<string, number>();
    faits.forEach(f => {
      const d = f.devise || 'XOF';
      compte.set(d, (compte.get(d) || 0) + 1);
    });
    return [...compte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'XOF';
  });

  readonly prejudiceFormate = computed(() => {
    const total = this.prejudiceTotal();
    if (total === 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(total));
  });
}
