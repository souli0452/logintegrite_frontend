import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stat-card-executif',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './stat-card-executif.html',
  styleUrl: './stat-card-executif.scss'
})
export class StatCardExecutif {
  readonly libelle = input.required<string>();
  readonly valeur = input.required<number>();
  readonly delta = input<number | null>(null);
  readonly comparaison = input<string>('vs annee precedente');
  /** Sens de l indicateur : la couleur de la barre laterale suit la charte (vert, jaune, rouge). */
  readonly ton = input<'neutre' | 'succes' | 'attention' | 'danger'>('neutre');
}
