import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReferentielHierarchique } from '../referentiel-hierarchique/referentiel-hierarchique';
import { EntiteOrganisationService } from '../../services/entite-organisation.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entites-organisation-page',
  standalone: true,
  imports: [ReferentielHierarchique],
  template: `
    <app-referentiel-hierarchique
      titrePage="Entites d'organisation"
      sousTitrePage="Ministeres, directions, services."
      libelleSingulier="entite"
      libelleSingulierComplet="entite d'organisation"
      [niveaux]="niveaux"
      [service]="service" />
  `
})
export class EntitesOrganisationPage {
  readonly service = inject(EntiteOrganisationService);
  readonly niveaux = [
    { valeur: 'MINISTERE', libelle: 'Ministere' },
    { valeur: 'DIRECTION', libelle: 'Direction' },
    { valeur: 'SERVICE', libelle: 'Service' }
  ];
}
