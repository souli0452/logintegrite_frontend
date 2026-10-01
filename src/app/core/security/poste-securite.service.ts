import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type TypeEvenementPoste =
  | 'COPIE_TENTEE' | 'COUPE_TENTEE' | 'IMPRESSION_TENTEE' | 'MENU_CONTEXTUEL'
  | 'CAPTURE_SUSPECTE' | 'OUTILS_DEVELOPPEUR';

/** Delai minimal entre deux signalements du meme type (evite de noyer le journal). */
const DELAI_ENTRE_SIGNALEMENTS_MS = 5000;

/**
 * Dissuasion et tracabilite sur le poste de l'utilisateur.
 *
 * Un navigateur ne peut PAS empecher une capture d'ecran ni une photo : ces garde-fous
 * rendent la fuite difficile, la masquent quand la fenetre perd le focus, et surtout
 * la rendent TRACABLE (filigrane au nom de l'utilisateur, signalements journalises).
 * Les champs de saisie restent utilisables (copier-coller dans un formulaire).
 */
@Injectable({ providedIn: 'root' })
export class PosteSecuriteService {
  private readonly http = inject(HttpClient);
  private readonly dernierSignalement = new Map<string, number>();
  private demarre = false;

  /** Vrai quand la fenetre n'est plus au premier plan : le contenu est alors masque. */
  readonly masque = signal(false);

  demarrer(): void {
    if (this.demarre || typeof document === 'undefined') return;
    this.demarre = true;

    document.addEventListener('copy', (e) => this.bloquerSiHorsSaisie(e, 'COPIE_TENTEE'));
    document.addEventListener('cut', (e) => this.bloquerSiHorsSaisie(e, 'COUPE_TENTEE'));
    document.addEventListener('contextmenu', (e) => this.bloquerSiHorsSaisie(e, 'MENU_CONTEXTUEL'));
    document.addEventListener('dragstart', (e) => { if (!this.estZoneDeSaisie(e.target)) e.preventDefault(); });
    document.addEventListener('keydown', (e) => this.surTouche(e));
    document.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen') this.surCapture(); });

    window.addEventListener('beforeprint', () => this.signaler('IMPRESSION_TENTEE', 'beforeprint'));
    window.addEventListener('blur', () => this.masque.set(true));
    window.addEventListener('focus', () => this.masque.set(false));
    document.addEventListener('visibilitychange', () => this.masque.set(document.visibilityState === 'hidden'));
  }

  private estZoneDeSaisie(cible: EventTarget | null, avecFocus = false): boolean {
    const selecteur = 'input, textarea, select, [contenteditable="true"], [data-copiable]';
    const el = cible instanceof Element ? cible : null;
    if (el?.closest(selecteur)) return true;
    if (!avecFocus) return false;
    const actif = document.activeElement;
    return !!actif && actif.matches(selecteur);
  }

  private bloquerSiHorsSaisie(e: Event, type: TypeEvenementPoste): void {
    // copier/couper : on regarde aussi le champ qui a le focus ; clic droit : seulement l'element vise
    if (this.estZoneDeSaisie(e.target, type !== 'MENU_CONTEXTUEL')) return;
    e.preventDefault();
    this.signaler(type);
  }

  private surTouche(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;
    const touche = e.key.toLowerCase();
    if (ctrl && touche === 'p') {
      e.preventDefault();
      this.signaler('IMPRESSION_TENTEE', 'Ctrl+P');
    } else if (e.key === 'F12' || (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(touche)) || (ctrl && touche === 'u')) {
      e.preventDefault();
      this.signaler('OUTILS_DEVELOPPEUR', e.key);
    } else if (ctrl && touche === 's') {
      e.preventDefault();
    } else if (e.key === 'PrintScreen') {
      this.surCapture();
    }
  }

  /** Touche « Impr. ecran » : on vide le presse-papiers (quand le navigateur l'autorise) et on journalise. */
  private surCapture(): void {
    try { void navigator.clipboard?.writeText(''); } catch { /* refus du navigateur : sans consequence */ }
    this.signaler('CAPTURE_SUSPECTE', 'PrintScreen');
  }

  private signaler(type: TypeEvenementPoste, detail?: string): void {
    const maintenant = Date.now();
    if (maintenant - (this.dernierSignalement.get(type) ?? 0) < DELAI_ENTRE_SIGNALEMENTS_MS) return;
    this.dernierSignalement.set(type, maintenant);
    this.http.post(`${environment.apiUrl}/audit/evenements-poste`,
      { type, page: location.pathname, detail }).subscribe({ error: () => { /* le journal ne doit jamais gener l'utilisateur */ } });
  }
}
