import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StatusBadge);
  });

  it('affiche le libelle et la classe du type demande', () => {
    fixture.componentRef.setInput('libelle', 'Validee');
    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.status-badge');
    expect(badge?.textContent?.trim()).toBe('Validee');
    expect(badge?.classList).toContain('status-badge--success');
  });

  it('utilise le style neutre par defaut', () => {
    fixture.componentRef.setInput('libelle', 'En attente');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.status-badge')?.classList)
      .toContain('status-badge--neutral');
  });
});
