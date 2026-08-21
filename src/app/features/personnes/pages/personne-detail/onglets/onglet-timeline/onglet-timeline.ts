import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData,
  CheckCircle2, FileText, PenLine, AlertTriangle, Search, Flag } from 'lucide-angular';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import {
  ImplicationResponse,
  FaitReprocheResponse,
  DossierResponse,
  DocumentResponse
} from '../../../../models/personne.models';

// Type d'evenement pour differencier les icones et couleurs
type TypeEvenement =
  | 'VALIDATION'
  | 'DOCUMENT'
  | 'CREATION_DOSSIER'
  | 'INFRACTION'
  | 'ENQUETE'
  | 'SIGNALEMENT';

interface EvenementTimeline {
  date: string;
  heure: string;
  type: TypeEvenement;
  titre: string;
  description: string;
  auteur?: string;
  badge?: string;
}

@Component({
  selector: 'app-onglet-timeline',
  standalone: true,
  imports: [LucideAngularModule, EmptyState],
  templateUrl: './onglet-timeline.html',
  styleUrl: './onglet-timeline.scss'
})
export class OngletTimeline {
  readonly implications = input.required<ImplicationResponse[]>();
  readonly faits = input.required<FaitReprocheResponse[]>();
  readonly dossiers = input.required<DossierResponse[]>();
  readonly documents = input.required<DocumentResponse[]>();

  readonly icons: Record<string, LucideIconData> = {
    CheckCircle2, FileText, PenLine, AlertTriangle, Search, Flag
  };

  // Construit une liste d'evenements agreges a partir des dossiers, faits,
  // implications et documents - trie par date decroissante.
  readonly evenements = computed<EvenementTimeline[]>(() => {
    const evts: EvenementTimeline[] = [];

    // Dossiers - creation
    for (const d of this.dossiers()) {
      evts.push({
        date: d.dateOuverture,
        heure: '00:00',
        type: 'CREATION_DOSSIER',
        titre: 'Creation du dossier ' + (d.numeroDossier ?? d.id.substring(0, 8)),
        description: d.intitule ?? 'Sans intitule',
        badge: 'Creation'
      });
    }

    // Faits - infractions
    for (const f of this.faits()) {
      evts.push({
        date: f.dateFaits,
        heure: '00:00',
        type: 'INFRACTION',
        titre: 'Nouvelle infraction enregistree',
        description: f.typeInfractionLibelle,
        badge: 'Infraction'
      });

      // Validation du fait si valide
      if (f.statutValidation === 'VALIDEE') {
        evts.push({
          date: f.dateFaits,
          heure: '00:00',
          type: 'VALIDATION',
          titre: 'Validation d\'une infraction',
          description: f.typeInfractionLibelle,
          badge: 'Valide'
        });
      }
    }

    // Documents
    for (const doc of this.documents()) {
      evts.push({
        date: doc.dateUpload.substring(0, 10),
        heure: doc.dateUpload.substring(11, 16),
        type: 'DOCUMENT',
        titre: 'Ajout d\'un document',
        description: doc.nomOriginal,
        badge: 'Document'
      });
    }

    // Implications - enquete
    for (const imp of this.implications()) {
      evts.push({
        date: imp.dateDebut,
        heure: '00:00',
        type: 'ENQUETE',
        titre: 'Implication enregistree',
        description: `${imp.roleImplicationLibelle}${imp.fonctionOccupee ? ' - ' + imp.fonctionOccupee : ''}`,
        badge: 'Enquete'
      });
    }

    // Tri decroissant par date
    return evts.sort((a, b) => b.date.localeCompare(a.date));
  });

  // Statistiques resume affichees en bas
  readonly resume = computed(() => {
    const evts = this.evenements();
    return {
      evenements: evts.length,
      documents: evts.filter((e) => e.type === 'DOCUMENT').length,
      infractions: evts.filter((e) => e.type === 'INFRACTION').length,
      validees: evts.filter((e) => e.type === 'VALIDATION').length
    };
  });

  // Retourne l'icone appropriee pour un type d'evenement
  iconeType(type: TypeEvenement): LucideIconData {
    switch (type) {
      case 'VALIDATION': return CheckCircle2;
      case 'DOCUMENT': return FileText;
      case 'CREATION_DOSSIER': return PenLine;
      case 'INFRACTION': return AlertTriangle;
      case 'ENQUETE': return Search;
      case 'SIGNALEMENT': return Flag;
    }
  }

  // Retourne la couleur BEM appropriee
  couleurType(type: TypeEvenement): string {
    switch (type) {
      case 'VALIDATION': return 'vert';
      case 'DOCUMENT': return 'bleu';
      case 'CREATION_DOSSIER': return 'violet';
      case 'INFRACTION': return 'orange';
      case 'ENQUETE': return 'jaune';
      case 'SIGNALEMENT': return 'gris';
    }
  }
}
