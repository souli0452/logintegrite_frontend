import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Donne un nom accessible aux boutons d'icone qui n'ont qu'une infobulle.
 * matTooltip decrit visuellement le bouton mais n'en fait pas le nom : un lecteur d'ecran annonce
 * alors "bouton" sans dire a quoi il sert. On reprend le texte de l'infobulle comme aria-label,
 * seulement si le bouton n'a ni texte visible ni aria-label deja defini.
 */
@Directive({
  selector: 'button[matTooltip], a[matTooltip]',
  standalone: true
})
export class NomAccessibleInfobulle {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly infobulle = inject(MatTooltip, { self: true });

  constructor() {
    afterNextRender(() => this.appliquer());
  }

  private appliquer(): void {
    const texteVisible = (this.element.textContent ?? '').trim();
    const dejaNomme = this.element.hasAttribute('aria-label') || this.element.hasAttribute('aria-labelledby');
    const message = this.infobulle.message?.trim();
    if (!texteVisible && !dejaNomme && message) {
      this.element.setAttribute('aria-label', message);
    }
  }
}
