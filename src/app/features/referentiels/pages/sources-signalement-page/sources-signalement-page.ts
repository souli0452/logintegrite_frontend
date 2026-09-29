import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReferentielSimpleListe } from '../referentiel-simple-liste/referentiel-simple-liste';
import { SourceSignalementService } from '../../services/source-signalement.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sources-signalement-page',
  standalone: true,
  imports: [ReferentielSimpleListe],
  template: `
    <app-referentiel-simple-liste
      titrePage="Sources de signalement"
      sousTitrePage="Origine des dossiers ouverts."
      libelleSingulier="source de signalement"
      [service]="service" />
  `
})
export class SourcesSignalementPage {
  readonly service = inject(SourceSignalementService);
}
