import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  // Plus de bouton manuel : repliee par defaut (mode icones), depliee
  // automatiquement au survol ou au focus clavier (voir Sidebar).
  readonly pliee = signal(true);

  etendre(): void {
    this.pliee.set(false);
  }

  reduire(): void {
    this.pliee.set(true);
  }
}
