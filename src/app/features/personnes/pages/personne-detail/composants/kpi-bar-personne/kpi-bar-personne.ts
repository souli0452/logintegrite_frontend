import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  FolderOpen, FileText, Gavel, Paperclip, Clock,
  LucideIconData
} from 'lucide-angular';
import { NomAccessibleInfobulle } from '../../../../../../shared/a11y/nom-accessible-infobulle';

/**
 * Barre horizontale des 5 KPIs clés de la fiche personne.
 * Chaque KPI (sauf "Dernière mise à jour") est cliquable et navigue vers
 * l'onglet correspondant du détail.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kpi-bar-personne',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, NomAccessibleInfobulle, LucideAngularModule],
  templateUrl: './kpi-bar-personne.html',
  styleUrl: './kpi-bar-personne.scss'
})
export class KpiBarPersonne {
  // ─── Inputs ────────────────────────────────────────────────────────────────
  readonly nbDossiers  = input<number>(0);
  readonly nbFaits     = input<number>(0);
  readonly nbPeines    = input<number>(0);
  readonly nbDocuments = input<number>(0);
  readonly derniereMiseAJour = input<Date | string | null>(null);

  // ─── Sortie ────────────────────────────────────────────────────────────────
  /**
   * Émis avec l'index de l'onglet à activer :
   * 0 = Aperçu, 1 = Informations, 2 = Dossiers & implications,
   * 3 = Peines & sanctions, 4 = Documents, 5 = Historique, 6 = Timeline
   */
  readonly naviguer = output<number>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    FolderOpen, FileText, Gavel, Paperclip, Clock
  };

  // ─── Affichage relatif de la date ──────────────────────────────────────────
  /**
   * Renvoie un libellé lisible pour la dernière mise à jour :
   * "aujourd'hui", "hier", "il y a X jours", ou la date formatée sinon.
   */
  readonly labelDerniereMaj = computed<string>(() => {
    const raw = this.derniereMiseAJour();
    if (!raw) return 'Non renseigné';

    const date = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(date.getTime())) return 'Non renseigné';

    const auj = new Date();
    const debutAuj = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
    const debutDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffJours = Math.floor((debutAuj.getTime() - debutDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffJours === 0) return "Aujourd'hui";
    if (diffJours === 1) return 'Hier';
    if (diffJours <= 7) return `Il y a ${diffJours} jours`;
    if (diffJours <= 30) {
      const semaines = Math.floor(diffJours / 7);
      return semaines === 1 ? 'Il y a 1 semaine' : `Il y a ${semaines} semaines`;
    }
    if (diffJours <= 365) {
      const mois = Math.floor(diffJours / 30);
      return mois === 1 ? 'Il y a 1 mois' : `Il y a ${mois} mois`;
    }
    // Trop ancien → date formatée
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  });

  /** Date formatée courte pour tooltip / affichage secondaire. */
  readonly dateComplete = computed<string>(() => {
    const raw = this.derniereMiseAJour();
    if (!raw) return '';
    const date = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  });
}
