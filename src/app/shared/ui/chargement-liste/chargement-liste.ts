import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Etat de chargement d'une liste : des lignes grisees qui reprennent la forme du tableau.
 * On voit tout de suite ce qui va arriver, et la page ne saute pas quand les donnees apparaissent.
 */
@Component({
  selector: 'app-chargement-liste',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="squelette" role="status" aria-live="polite" aria-label="Chargement en cours">
      @for (_ of lignes(); track $index) {
        <div class="squelette__ligne" aria-hidden="true">
          <span class="squelette__rond"></span>
          <span class="squelette__texte">
            <span class="squelette__barre" [style.width.%]="longueur($index)"></span>
            <span class="squelette__barre squelette__barre--fine"></span>
          </span>
          <span class="squelette__pastille"></span>
        </div>
      }
    </div>
  `,
  styleUrl: './chargement-liste.scss'
})
export class ChargementListe {
  readonly nombre = input(6);

  protected lignes(): number[] {
    return Array.from({ length: this.nombre() }, (_, i) => i);
  }

  /** Longueurs variees : une liste reelle n'a jamais des lignes toutes identiques. */
  protected longueur(i: number): number {
    return [58, 44, 66, 50, 38, 62][i % 6];
  }
}
