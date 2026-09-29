import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReferentielSimpleListe } from '../referentiel-simple-liste/referentiel-simple-liste';
import { NationaliteService } from '../../services/nationalite.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nationalite-liste',
  standalone: true,
  imports: [ReferentielSimpleListe],
  template: `
    <app-referentiel-simple-liste
      titrePage="Nationalités"
      sousTitrePage="Référentiel des nationalités (liste ISO — Burkinabè en tête)"
      libelleSingulier="nationalité"
      [service]="service"
      [avecActif]="true">
    </app-referentiel-simple-liste>
  `
})
export class NationaliteListe {
  readonly service = inject(NationaliteService);
}
