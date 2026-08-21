import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, User, Building2, FileText, LucideIconData } from 'lucide-angular';
import { PersonnePhysiqueResponse, PersonneMoraleResponse } from '../../../../models/personne.models';

@Component({
  selector: 'app-onglet-vue-ensemble',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './onglet-vue-ensemble.html',
  styleUrl: './onglet-vue-ensemble.scss'
})
export class OngletVueEnsemble {
  readonly personnePhysique = input<PersonnePhysiqueResponse | null>(null);
  readonly personneMorale = input<PersonneMoraleResponse | null>(null);
  readonly nombreImplications = input<number>(0);
  readonly nombreDocuments = input<number>(0);

  readonly icons: Record<string, LucideIconData> = { User, Building2, FileText };

  readonly initiales = computed(() => {
    const p = this.personnePhysique();
    if (p) {
      const debut = (p.prenoms?.charAt(0) ?? '').toUpperCase();
      const fin = (p.nomNaissance?.charAt(0) ?? '').toUpperCase();
      return debut + fin;
    }
    const m = this.personneMorale();
    if (m) {
      return (m.denominationSociale?.substring(0, 2) ?? '??').toUpperCase();
    }
    return '??';
  });
}
