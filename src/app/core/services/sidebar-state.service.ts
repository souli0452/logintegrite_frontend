import { Injectable, signal } from '@angular/core';

const CLE_PREFERENCE = 'logintegrite.menu.plie';
const LARGEUR_PETIT_ECRAN = 900;

/**
 * Etat du menu lateral : deplie par defaut sur ordinateur (les libelles restent visibles),
 * replie par defaut sur petit ecran. Le choix de l'utilisateur est memorise dans ce navigateur.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  readonly pliee = signal(this.etatInitial());

  etendre(): void {
    this.definir(false);
  }

  reduire(): void {
    this.definir(true);
  }

  basculer(): void {
    this.definir(!this.pliee());
  }

  private definir(pliee: boolean): void {
    this.pliee.set(pliee);
    try {
      localStorage.setItem(CLE_PREFERENCE, pliee ? '1' : '0');
    } catch {
      /* stockage indisponible (navigation privee) : la preference n'est simplement pas memorisee */
    }
  }

  private etatInitial(): boolean {
    if (typeof window !== 'undefined' && window.innerWidth <= LARGEUR_PETIT_ECRAN) {
      return true;
    }
    try {
      return localStorage.getItem(CLE_PREFERENCE) === '1';
    } catch {
      return false;
    }
  }
}
