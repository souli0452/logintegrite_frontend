import { TestBed } from '@angular/core/testing';
import { SidebarStateService } from './sidebar-state.service';

describe('SidebarStateService', () => {
  it('demarre repliee, se deplie et se replie', () => {
    const service = TestBed.inject(SidebarStateService);

    expect(service.pliee()).toBe(true);
    service.etendre();
    expect(service.pliee()).toBe(false);
    service.reduire();
    expect(service.pliee()).toBe(true);
  });
});
