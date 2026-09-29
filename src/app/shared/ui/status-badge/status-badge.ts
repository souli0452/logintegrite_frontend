import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

export type StatusType = 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss'
})
export class StatusBadge {
  readonly libelle = input.required<string>();
  readonly type = input<StatusType>('neutral');

  // Classe CSS calculee a partir du type - le SCSS applique les couleurs
  readonly classeType = computed(() => `status-badge--${this.type()}`);
}
