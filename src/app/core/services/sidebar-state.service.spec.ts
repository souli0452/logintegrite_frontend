import { TestBed } from '@angular/core/testing';
import { SidebarStateService } from './sidebar-state.service';

describe('SidebarStateService', () => {
  beforeEach(() => {
    try { localStorage.removeItem('logintegrite.menu.plie'); } catch { /* sans objet */ }
  });

  it('se replie, se deplie et bascule', () => {
    const service = TestBed.inject(SidebarStateService);

    service.reduire();
    expect(service.pliee()).toBe(true);
    service.etendre();
    expect(service.pliee()).toBe(false);
    service.basculer();
    expect(service.pliee()).toBe(true);
  });

  it('memorise le choix de l utilisateur', () => {
    TestBed.inject(SidebarStateService).reduire();
    expect(localStorage.getItem('logintegrite.menu.plie')).toBe('1');
  });
});
