import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Filigrane : le nom de l'utilisateur et l'heure, repetes en diagonale sur toute la page.
 * Une capture d'ecran ou une photo de l'ecran permet alors d'identifier qui l'a faite.
 * Il ne gene ni la lecture ni les clics (pointer-events: none).
 */
@Component({
  selector: 'app-filigrane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="filigrane" [style.background-image]="fond()" aria-hidden="true"></div>`,
  styles: [`
    .filigrane {
      position: fixed;
      inset: 0;
      z-index: 2000;
      pointer-events: none;
      background-repeat: repeat;
    }
    @media print { .filigrane { display: none; } }
  `]
})
export class Filigrane implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly maintenant = signal(new Date());
  private readonly minuteur = setInterval(() => this.maintenant.set(new Date()), 30_000);

  readonly fond = computed(() => {
    const qui = (this.auth.username() ?? 'utilisateur').replace(/[<>&"']/g, '');
    const quand = this.maintenant().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200">` +
      `<text x="180" y="100" text-anchor="middle" transform="rotate(-24 180 100)" ` +
      `font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#0f172a" fill-opacity="0.07">` +
      `${qui} · ${quand}</text></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  });

  ngOnDestroy(): void { clearInterval(this.minuteur); }
}
