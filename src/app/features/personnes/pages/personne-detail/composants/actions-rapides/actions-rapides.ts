import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  Zap, FolderPlus, Scale, Gavel, Paperclip,
  Camera, Tag, IdCard, Pencil,
  LucideIconData
} from 'lucide-angular';

import { PersonneDetailComplet } from '../../../../services/personne-detail.service';
import { NomAccessibleInfobulle } from '../../../../../../shared/a11y/nom-accessible-infobulle';

export type TypeActionRapide =
  | 'dossier'
  | 'implication'
  | 'peine'
  | 'document'
  | 'photo'
  | 'alias'
  | 'piece-identite'
  | 'statut';

/**
 * Panneau compact des actions rapides sur une fiche personne.
 * Évite à l'agent de naviguer entre les onglets pour effectuer une action fréquente.
 */
@Component({
  selector: 'app-actions-rapides',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, NomAccessibleInfobulle, LucideAngularModule],
  templateUrl: './actions-rapides.html',
  styleUrl: './actions-rapides.scss'
})
export class ActionsRapides {
  readonly donnees = input.required<PersonneDetailComplet>();
  readonly action = output<TypeActionRapide>();

  readonly icons: Record<string, LucideIconData> = {
    Zap, FolderPlus, Scale, Gavel, Paperclip,
    Camera, Tag, IdCard, Pencil
  };

  /**
   * Vrai si la personne a au moins un fait reproché sur lequel on peut poser un statut.
   * Sinon on désactive le bouton "Modifier statut".
   */
  readonly peutModifierStatut = computed(() => {
    const d = this.donnees();
    return (d.implicationFaits?.length ?? 0) > 0;
  });

  /**
   * Vrai si la personne a au moins une implication à laquelle rattacher une peine.
   */
  readonly peutAjouterPeine = computed(() => {
    const d = this.donnees();
    return (d.implicationFaits?.length ?? 0) > 0;
  });

  /**
   * Tooltip dynamique pour l'ajout de peine.
   */
  get tooltipPeine(): string {
    return this.peutAjouterPeine()
      ? 'Ajouter une peine ou sanction'
      : "Aucun fait reproché — impossible d'ajouter une peine";
  }

  /**
   * Tooltip dynamique pour la modification du statut.
   */
  get tooltipStatut(): string {
    return this.peutModifierStatut()
      ? 'Mettre à jour le statut judiciaire'
      : 'Aucun fait reproché — impossible de définir un statut';
  }

  declencher(type: TypeActionRapide): void {
    this.action.emit(type);
  }
}
