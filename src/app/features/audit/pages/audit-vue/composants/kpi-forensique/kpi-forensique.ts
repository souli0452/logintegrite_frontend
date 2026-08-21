import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  Activity,
  Eye,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Pencil,
  Trash2,
  MoonStar,
  Globe,
  LucideIconData
} from 'lucide-angular';

import { KpiForensiqueResponse } from '../../../../models/audit.models';

/**
 * 4 cartes KPI forensiques : Actions du jour, Consultations 24h,
 * Utilisateurs actifs, Alertes de sécurité.
 */
@Component({
  selector: 'app-kpi-forensique',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, LucideAngularModule],
  templateUrl: './kpi-forensique.html',
  styleUrl: './kpi-forensique.scss'
})
export class KpiForensique {
  readonly kpi = input<KpiForensiqueResponse | null>(null);
  readonly chargement = input<boolean>(false);

  readonly icons: Record<string, LucideIconData> = {
    Activity, Eye, Users, AlertTriangle, TrendingUp, TrendingDown, Minus,
    Plus, Pencil, Trash2, MoonStar, Globe
  };

  // ─── Trend actions du jour ─────────────────────────────────────────────────
  readonly trendActions = computed<'up' | 'down' | 'flat'>(() => {
    const d = this.kpi()?.deltaActionsVsHier ?? 0;
    if (d > 0) return 'up';
    if (d < 0) return 'down';
    return 'flat';
  });

  // ─── Trend consultations ───────────────────────────────────────────────────
  readonly trendConsultations = computed<'up' | 'down' | 'flat'>(() => {
    const p = this.kpi()?.deltaConsultationsPct;
    if (p === null || p === undefined) return 'flat';
    if (p > 0) return 'up';
    if (p < 0) return 'down';
    return 'flat';
  });

  // ─── Niveau de gravité alertes ─────────────────────────────────────────────
  readonly niveauAlerte = computed<'ok' | 'faible' | 'moyen' | 'eleve'>(() => {
    const n = this.kpi()?.alertesOuvertes ?? 0;
    if (n === 0) return 'ok';
    if (n < 3) return 'faible';
    if (n < 10) return 'moyen';
    return 'eleve';
  });
}
