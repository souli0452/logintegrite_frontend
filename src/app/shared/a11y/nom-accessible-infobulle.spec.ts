import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NomAccessibleInfobulle } from './nom-accessible-infobulle';

@Component({
  imports: [MatTooltipModule, NomAccessibleInfobulle],
  template: `
    <button id="icone" matTooltip="Supprimer le dossier"><svg></svg></button>
    <button id="texte" matTooltip="Infobulle secondaire">Enregistrer</button>
    <button id="deja" matTooltip="Autre" aria-label="Nom deja fourni"><svg></svg></button>
    <a id="lien" matTooltip="Ouvrir la fiche"><svg></svg></a>
  `
})
class Hote {}

describe('NomAccessibleInfobulle', () => {
  async function rendre() {
    const fixture = TestBed.createComponent(Hote);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('donne le texte de l\'infobulle comme nom aux boutons et liens d\'icone', async () => {
    const el = await rendre();
    expect(el.querySelector('#icone')?.getAttribute('aria-label')).toBe('Supprimer le dossier');
    expect(el.querySelector('#lien')?.getAttribute('aria-label')).toBe('Ouvrir la fiche');
  });

  it('ne modifie pas un bouton qui a deja un texte visible', async () => {
    expect((await rendre()).querySelector('#texte')?.hasAttribute('aria-label')).toBe(false);
  });

  it('respecte un aria-label deja defini', async () => {
    expect((await rendre()).querySelector('#deja')?.getAttribute('aria-label')).toBe('Nom deja fourni');
  });
});
