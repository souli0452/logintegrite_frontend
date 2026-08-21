import { Component, input } from '@angular/core';
import { LucideAngularModule, Construction, LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-en-construction',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './en-construction.html',
  styleUrl: './en-construction.scss'
})
export class EnConstruction {
  readonly titre = input.required<string>();
  readonly message = input<string>('Ce module sera disponible prochainement.');
  readonly icone: LucideIconData = Construction;
}
