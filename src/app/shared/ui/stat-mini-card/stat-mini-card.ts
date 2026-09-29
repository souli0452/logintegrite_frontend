import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

type CouleurStat = 'green' | 'yellow' | 'blue' | 'gray';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stat-mini-card',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './stat-mini-card.html',
  styleUrl: './stat-mini-card.scss'
})
export class StatMiniCard {
  readonly libelle = input.required<string>();
  readonly valeur = input.required<number | string>();
  readonly soustitre = input<string | null>(null);
  readonly icone = input.required<LucideIconData>();
  readonly couleur = input<CouleurStat>('gray');
}
