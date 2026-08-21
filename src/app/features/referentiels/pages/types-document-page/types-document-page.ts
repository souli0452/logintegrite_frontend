import { Component, inject } from '@angular/core';
import { ReferentielSimpleListe } from '../referentiel-simple-liste/referentiel-simple-liste';
import { TypeDocumentService } from '../../services/type-document.service';

@Component({
  selector: 'app-types-document-page',
  standalone: true,
  imports: [ReferentielSimpleListe],
  template: `
    <app-referentiel-simple-liste
      titrePage="Types de document"
      sousTitrePage="Nature des pieces jointes aux dossiers."
      libelleSingulier="type de document"
      [service]="service"
      [avecActif]="true" />
  `
})
export class TypesDocumentPage {
  readonly service = inject(TypeDocumentService);
}
