import { Injectable, Provider } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
  NativeDateAdapter
} from '@angular/material/core';

/**
 * Adaptateur de dates pour des utilisateurs francophones.
 * L'adaptateur natif d'Angular Material lit "02/03/1975" comme le 3 fevrier (mois d'abord) et refuse
 * "15/06/2026" : la saisie au clavier au format jj/mm/aaaa doit donner le bon jour.
 * Accepte jj/mm/aaaa, jj-mm-aaaa, jj.mm.aaaa et l'ISO aaaa-mm-jj ; toute autre saisie est invalide.
 */
@Injectable()
export class FrenchDateAdapter extends NativeDateAdapter {
  override parse(valeur: unknown): Date | null {
    if (typeof valeur !== 'string') return super.parse(valeur);

    const texte = valeur.trim();
    if (!texte) return null;

    const francais = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(texte);
    if (francais) return this.dateStricte(+francais[3], +francais[2], +francais[1]);

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
    if (iso) return this.dateStricte(+iso[1], +iso[2], +iso[3]);

    return this.invalid();
  }

  /** Refuse les dates qui n'existent pas (31/02/2026) au lieu de les reporter au mois suivant. */
  private dateStricte(annee: number, mois: number, jour: number): Date {
    const date = new Date(annee, mois - 1, jour);
    const valide = date.getFullYear() === annee && date.getMonth() === mois - 1 && date.getDate() === jour;
    return valide ? date : this.invalid();
  }
}

/** A utiliser dans les `providers` des composants (ou de l'application) a la place de provideNativeDateAdapter(). */
export function provideFrenchDateAdapter(): Provider[] {
  return [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: FrenchDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS }
  ];
}
