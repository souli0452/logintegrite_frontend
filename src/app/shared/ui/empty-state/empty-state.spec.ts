import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `<app-empty-state titre="Aucun dossier" message="Creez un premier dossier."><button id="action">Creer</button></app-empty-state>`
})
class HoteAvecMessage {}

@Component({
  imports: [EmptyState],
  template: `<app-empty-state titre="Rien ici"></app-empty-state>`
})
class HoteSansMessage {}

describe('EmptyState', () => {
  it('affiche le titre, le message et le contenu projete', () => {
    const fixture = TestBed.createComponent(HoteAvecMessage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.empty-state__title')?.textContent).toContain('Aucun dossier');
    expect(el.querySelector('.empty-state__message')?.textContent).toContain('Creez un premier dossier.');
    expect(el.querySelector('.empty-state__actions #action')?.textContent).toBe('Creer');
  });

  it('n\'affiche pas de paragraphe quand il n\'y a pas de message', () => {
    const fixture = TestBed.createComponent(HoteSansMessage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.empty-state__message')).toBeNull();
  });
});
