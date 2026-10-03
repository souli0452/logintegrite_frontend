import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  ArrowLeft, ChevronDown, Copy, Download, Lock, Unlock, Trash2, Pencil,
  Folder, Calendar, User2, FileSearch, Radio, Info, ShieldAlert, ShieldCheck,
  Building2, MapPin, Hash, Clock, AlertCircle,
  LucideIconData
} from 'lucide-angular';

import { DossierResponse, StatutDossier } from '../../../../models/dossier.models';
import { NomAccessibleInfobulle } from '../../../../../../shared/a11y/nom-accessible-infobulle';

/**
 * Hero de la fiche dossier — style "Dossier officiel ASCE-LC" cohérent avec la fiche personne.
 * 3 zones : sceau supérieur vert, corps 2 colonnes (identité + vitrine statut), filet bas.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero-dossier',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatTooltipModule, NomAccessibleInfobulle, LucideAngularModule],
  templateUrl: './hero-dossier.html',
  styleUrl: './hero-dossier.scss'
})
export class HeroDossier {
  private readonly snack = inject(MatSnackBar);

  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly dossier = input.required<DossierResponse>();
  readonly telechargementEnCours = input<boolean>(false);

  // ─── Sorties ───────────────────────────────────────────────────────────────
  readonly retour = output<void>();
  readonly imprimer = output<void>();
  readonly cloturer = output<void>();
  readonly modifier = output<void>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    ArrowLeft, ChevronDown, Copy, Download, Lock, Unlock, Trash2, Pencil,
    Folder, Calendar, User2, FileSearch, Radio, Info, ShieldAlert, ShieldCheck,
    Building2, MapPin, Hash, Clock, AlertCircle
  };

  // ─── Statut calculé ────────────────────────────────────────────────────────
  readonly estOuvert = computed(() => this.dossier().statutDossier === 'OUVERT');

  readonly libelleStatut = computed(() =>
    this.dossier().statutDossier === 'OUVERT' ? 'En cours d\'instruction' : 'Dossier clôturé'
  );

  readonly variantStatut = computed<'ouvert' | 'clos'>(() =>
    this.dossier().statutDossier === 'OUVERT' ? 'ouvert' : 'clos'
  );

  // ─── Numéro de fiche formaté ───────────────────────────────────────────────
  readonly numeroFicheDisplay = computed(() => {
    const d = this.dossier();
    return d.numeroDossier || '—';
  });

  // ─── Durée d'instruction (âge du dossier) ──────────────────────────────────
  readonly dureeInstruction = computed(() => {
    const d = this.dossier();
    if (!d.dateOuverture) return null;
    const debut = new Date(d.dateOuverture);
    const fin = d.dateCloture ? new Date(d.dateCloture) : new Date();
    const jours = Math.floor((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));
    if (jours < 1) return 'Ouvert aujourd\'hui';
    if (jours === 1) return '1 jour';
    if (jours < 30) return `${jours} jours`;
    if (jours < 365) {
      const mois = Math.floor(jours / 30);
      return `${mois} mois`;
    }
    const annees = Math.floor(jours / 365);
    const moisRestants = Math.floor((jours % 365) / 30);
    return moisRestants > 0 ? `${annees} an${annees > 1 ? 's' : ''} ${moisRestants} mois`
                             : `${annees} an${annees > 1 ? 's' : ''}`;
  });

  // ─── Actions ───────────────────────────────────────────────────────────────
  async copierNumero(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.numeroFicheDisplay());
      this.snack.open('Numéro de dossier copié', 'Fermer', {
        duration: 2000,
        panelClass: 'toast-succes'
      });
    } catch {
      this.snack.open('Impossible de copier', 'Fermer', { duration: 2500 });
    }
  }
}
