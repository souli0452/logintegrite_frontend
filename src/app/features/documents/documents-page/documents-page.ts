import { Component } from '@angular/core';
import { EnConstruction } from '../../../shared/en-construction/en-construction';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [EnConstruction],
  template: `<app-en-construction titre="Documents" message="Le module Documents sera integre prochainement." />`
})
export class DocumentsPage {}
