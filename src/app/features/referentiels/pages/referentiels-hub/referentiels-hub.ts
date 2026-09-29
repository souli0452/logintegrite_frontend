import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { 
  LucideAngularModule, ChevronRight, LucideIconData,
  FolderTree, Tag, Scale, MapPin, Building, User, Radio, FileType,
  Globe2, IdCard
} from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';

interface CarteReferentiel {
  route: string;
  titre: string;
  description: string;
  icone: LucideIconData;
  disponible: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-referentiels-hub',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, PageHeader],
  templateUrl: './referentiels-hub.html',
  styleUrl: './referentiels-hub.scss'
})
export class ReferentielsHub {
  readonly icons = { ChevronRight };

  readonly cartes: CarteReferentiel[] = [
    { route: '/referentiels/categories-infraction', titre: "Categories d'infraction",
      description: 'Niveau 1 de la nomenclature.', icone: FolderTree, disponible: true },
    { route: '/referentiels/types-infraction', titre: "Types d'infraction",
      description: 'Detail des infractions par categorie.', icone: Tag, disponible: true },
    { route: '/referentiels/statuts-judiciaires', titre: 'Statuts judiciaires',
      description: "Etats possibles d'une affaire.", icone: Scale, disponible: true },
    { route: '/referentiels/zones-geographiques', titre: 'Zones geographiques',
      description: 'Regions, provinces, communes.', icone: MapPin, disponible: true },
    { route: '/referentiels/entites-organisation', titre: "Entites d'organisation",
      description: 'Ministeres, directions, services.', icone: Building, disponible: true },
    { route: '/referentiels/roles-implication', titre: "Roles d'implication",
      description: 'Nature du role dans un dossier.', icone: User, disponible: true },
    { route: '/referentiels/sources-signalement', titre: 'Sources de signalement',
      description: 'Origine des dossiers ouverts.', icone: Radio, disponible: true },
    { route: '/referentiels/types-document', titre: 'Types de document',
      description: 'Pieces jointes possibles.', icone: FileType, disponible: true },
    { route: '/referentiels/nationalites', titre: 'Nationalités',
      description: 'Liste ISO des nationalités reconnues.', icone: Globe2, disponible: true },
    { route: '/referentiels/types-piece-identite', titre: 'Types de pièce d\'identité',
    description: 'Documents d\'identité acceptés (CNIB, passeport, permis...).',
    icone: IdCard, disponible: true },
  ];
}
