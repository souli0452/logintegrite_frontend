import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReferentielHierarchique } from '../referentiel-hierarchique/referentiel-hierarchique';
import { ZoneGeographiqueService } from '../../services/zone-geographique.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-zones-geographiques-page',
  standalone: true,
  imports: [ReferentielHierarchique],
  template: `
    <app-referentiel-hierarchique
      titrePage="Zones geographiques"
      sousTitrePage="Regions, provinces, communes."
      libelleSingulier="zone"
      libelleSingulierComplet="zone geographique"
      [niveaux]="niveaux"
      [service]="service" />
  `
})
export class ZonesGeographiquesPage {
  readonly service = inject(ZoneGeographiqueService);
  readonly niveaux = [
    { valeur: 'PAYS', libelle: 'Pays' },
    { valeur: 'REGION', libelle: 'Region' },
    { valeur: 'PROVINCE', libelle: 'Province' },
    { valeur: 'COMMUNE', libelle: 'Commune' }
  ];
}
