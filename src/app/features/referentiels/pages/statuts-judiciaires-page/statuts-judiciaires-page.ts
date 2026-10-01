import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReferentielSimpleListe } from '../referentiel-simple-liste/referentiel-simple-liste';
import { StatutJudiciaireService } from '../../services/statut-judiciaire.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-statuts-judiciaires-page',
  standalone: true,
  imports: [ReferentielSimpleListe],
  template: `
    <app-referentiel-simple-liste
      titrePage="Statuts judiciaires"
      sousTitrePage="États possibles d'une affaire judiciaire."
      libelleSingulier="statut judiciaire"
      [service]="service"
      [avecActif]="true" />
  `
})
export class StatutsJudiciairesPage {
  readonly service = inject(StatutJudiciaireService);
}
