import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData, Inbox } from 'lucide-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss'
})
export class EmptyState {
  readonly titre = input.required<string>();
  readonly message = input<string | null>(null);
  readonly icone = input<LucideIconData>(Inbox); // Icone par defaut si non fournie
}
