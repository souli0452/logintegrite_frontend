import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  User, Briefcase, MapPin, Info, Camera, Tag, IdCard,
  Plus, Pencil, MoreVertical, Eye, Download, Trash2,
  Mars, Venus, Circle, ArrowRight, CheckCircle2,
  LucideIconData
} from 'lucide-angular';

import {
  PersonnePhysiqueResponse, PersonneMoraleResponse,
  AliasResponse, PieceIdentiteResponse
} from '../../../../models/personne.models';

/**
 * Onglet Fiche identitaire — vue détaillée de l'état civil.
 * Grille 3x2 avec :
 * - Haut : État civil / Prof / Coordonnées (+ Encart enregistrement)
 * - Bas  : Photo / Alias / Pièces d'identité
 */
@Component({
  selector: 'app-onglet-infos',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DecimalPipe,
    MatTooltipModule, MatMenuModule, LucideAngularModule
  ],
  templateUrl: './onglet-infos.html',
  styleUrl: './onglet-infos.scss'
})
export class OngletInfos {
  private readonly snack = inject(MatSnackBar);

  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly personnePhysique = input<PersonnePhysiqueResponse | null>(null);
  readonly personneMorale = input<PersonneMoraleResponse | null>(null);
  readonly alias = input<AliasResponse[]>([]);
  readonly piecesIdentite = input<PieceIdentiteResponse[]>([]);
  readonly photoUrl = input<string | null>(null);
  readonly photoMetadonnees = input<{
    nomOriginal?: string;
    typeMime?: string;
    tailleKo?: number;
    dateAjout?: Date | string;
  } | null>(null);
  readonly creePar = input<string>('—');
  readonly dateCreation = input<Date | string | null>(null);
  readonly dateModification = input<Date | string | null>(null);

  // ─── Sorties (actions déléguées au parent) ────────────────────────────────
  readonly modifierIdentite = output<void>();
  readonly modifierProfession = output<void>();
  readonly modifierCoordonnees = output<void>();
  readonly changerPhoto = output<void>();
  readonly voirPhoto = output<void>();
  readonly telechargerPhoto = output<void>();
  readonly supprimerPhoto = output<void>();
  readonly ajouterAlias = output<void>();
  readonly modifierAlias = output<string>();     // aliasId
  readonly supprimerAlias = output<string>();    // aliasId
  readonly voirTousAlias = output<void>();
  readonly ajouterPiece = output<void>();
  readonly voirToutesPieces = output<void>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    User, Briefcase, MapPin, Info, Camera, Tag, IdCard,
    Plus, Pencil, MoreVertical, Eye, Download, Trash2,
    Mars, Venus, Circle, ArrowRight, CheckCircle2
  };

  // ─── Type actif ────────────────────────────────────────────────────────────
  readonly estPhysique = computed(() => this.personnePhysique() !== null);
  readonly estMorale = computed(() => this.personneMorale() !== null);

  // ─── Âge pour personne physique ────────────────────────────────────────────
  readonly ageAffichage = computed<string>(() => {
    const p = this.personnePhysique();
    if (!p?.dateNaissance) return '';
    const naissance = new Date(p.dateNaissance);
    const auj = new Date();
    let age = auj.getFullYear() - naissance.getFullYear();
    const m = auj.getMonth() - naissance.getMonth();
    if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) age--;
    return ` (${age} ans)`;
  });

  // ─── Libellés ──────────────────────────────────────────────────────────────
  libelleSituation(situation: string | undefined): string {
    if (!situation) return '—';
    const map: Record<string, string> = {
      CELIBATAIRE: 'Célibataire',
      MARIE: 'Marié(e)',
      DIVORCE: 'Divorcé(e)',
      VEUF: 'Veuf/Veuve'
    };
    return map[situation] || situation;
  }

  // ─── Actions ───────────────────────────────────────────────────────────────
  async copier(valeur: string, libelle: string = 'Copié'): Promise<void> {
    try {
      await navigator.clipboard.writeText(valeur);
      this.snack.open(libelle, 'Fermer', { duration: 1800 });
    } catch {
      this.snack.open('Impossible de copier', 'Fermer', { duration: 2500 });
    }
  }
}
