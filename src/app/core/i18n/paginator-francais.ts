import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Libelles francais de la pagination des tableaux (Material les fournit en anglais par defaut). */
@Injectable()
export class PaginatorFrancais extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Lignes par page';
  override nextPageLabel = 'Page suivante';
  override previousPageLabel = 'Page précédente';
  override firstPageLabel = 'Première page';
  override lastPageLabel = 'Dernière page';

  override getRangeLabel = (page: number, taillePage: number, total: number): string => {
    if (total === 0 || taillePage === 0) {
      return '0 sur 0';
    }
    const debut = page * taillePage;
    const fin = Math.min(debut + taillePage, total);
    return `${debut + 1} – ${fin} sur ${total}`;
  };
}
