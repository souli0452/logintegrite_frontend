import { Component, inject } from '@angular/core';
import { ReferentielSimpleListe } from '../referentiel-simple-liste/referentiel-simple-liste';
import { RoleImplicationService } from '../../services/role-implication.service';

@Component({
  selector: 'app-roles-implication-page',
  standalone: true,
  imports: [ReferentielSimpleListe],
  template: `
    <app-referentiel-simple-liste
      titrePage="Roles d'implication"
      sousTitrePage="Nature du role d'une personne dans un dossier."
      libelleSingulier="role d'implication"
      [service]="service"
      [avecActif]="true" />
  `
})
export class RolesImplicationPage {
  readonly service = inject(RoleImplicationService);
}
