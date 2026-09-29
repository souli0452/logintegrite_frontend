import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss'
})
export class PageHeader {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string | null>(null);
}
