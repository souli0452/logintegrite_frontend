import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, of } from 'rxjs';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService', () => {
  function service(resultatFermeture: unknown): ConfirmationService {
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(resultatFermeture) }) };
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: dialog }] });
    return TestBed.inject(ConfirmationService);
  }

  it('renvoie true uniquement si l\'utilisateur a confirme', async () => {
    expect(await firstValueFrom(service(true).demander({ titre: 't', message: 'm' }))).toBe(true);
  });

  it('renvoie false si l\'utilisateur annule ou ferme la fenetre', async () => {
    expect(await firstValueFrom(service(false).demander({ titre: 't', message: 'm' }))).toBe(false);
    TestBed.resetTestingModule();
    expect(await firstValueFrom(service(undefined).demander({ titre: 't', message: 'm' }))).toBe(false);
  });
});
