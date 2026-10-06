import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/auth/auth.service';
import { RapportService } from '../services/rapport.service';
import { EtatTrimestrielService } from '../services/etat-trimestriel.service';
import { EtatsTrimestrielsPage } from './etats-trimestriels-page';

const etat = (id: string, remplace = false) => ({
  id, annee: 2026, trimestre: 3, dateArret: '2026-09-30', dateGeneration: '2026-10-06T10:00:00Z',
  generePar: 'SYSTEME', nbPersonnes: 12, sha256Pdf: 'a'.repeat(64), sha256Excel: 'b'.repeat(64), remplace
});

describe('EtatsTrimestrielsPage', () => {
  const etats = { lister: vi.fn(), pdf: vi.fn(), excel: vi.fn(), generer: vi.fn() };
  const rapports = { telecharger: vi.fn() };
  const toastr = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const dialog = { open: vi.fn() };
  let admin = true;

  function creer() {
    TestBed.configureTestingModule({
      imports: [EtatsTrimestrielsPage],
      providers: [
        { provide: EtatTrimestrielService, useValue: etats },
        { provide: RapportService, useValue: rapports },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { hasRole: (r: string) => admin && r === 'ADMIN' } }
      ]
    });
    const fixture = TestBed.createComponent(EtatsTrimestrielsPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => { vi.resetAllMocks(); admin = true; });

  it('charge et affiche les etats', () => {
    etats.lister.mockReturnValue(of([etat('a'), etat('b', true)]));
    const f = creer();
    expect(f.componentInstance.etats().length).toBe(2);
    expect(f.componentInstance.erreur()).toBeNull();
  });

  it('liste vide : aucun etat, pas d\'erreur', () => {
    etats.lister.mockReturnValue(of([]));
    const f = creer();
    expect(f.componentInstance.etats()).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Aucun état');
  });

  it('echec du chargement : message d\'erreur', () => {
    etats.lister.mockReturnValue(throwError(() => ({ status: 403 })));
    const f = creer();
    expect(f.componentInstance.erreur()).toBeTruthy();
  });

  it('seul l\'administrateur peut generer', () => {
    etats.lister.mockReturnValue(of([]));
    admin = false;
    expect(creer().componentInstance.peutGenerer()).toBe(false);
  });

  it('telecharge le PDF avec un nom parlant', () => {
    etats.lister.mockReturnValue(of([etat('a')]));
    const blob = new Blob(['x']);
    etats.pdf.mockReturnValue(of(blob));
    const f = creer();
    f.componentInstance.telechargerPdf(f.componentInstance.etats()[0]);
    expect(rapports.telecharger).toHaveBeenCalledWith(blob, 'etat-trimestriel-T3-2026.pdf');
  });

  it('generer : confirmation puis appel, rechargement et toast', () => {
    etats.lister.mockReturnValue(of([]));
    etats.generer.mockReturnValue(of(undefined));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(etats.generer).toHaveBeenCalledWith(2026, 3);
    expect(toastr.success).toHaveBeenCalled();
    expect(etats.lister).toHaveBeenCalledTimes(2);
    expect(f.componentInstance.enGeneration()).toBe(false);
  });

  it('generer annule : aucun appel', () => {
    etats.lister.mockReturnValue(of([]));
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(etats.generer).not.toHaveBeenCalled();
  });

  it('generer : le message du serveur est affiche (limite atteinte)', () => {
    etats.lister.mockReturnValue(of([]));
    etats.generer.mockReturnValue(throwError(() => ({ error: { message: 'limite atteinte' } })));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(toastr.error).toHaveBeenCalledWith('limite atteinte');
    expect(f.componentInstance.enGeneration()).toBe(false);
  });

  it('pas de double generation pendant qu\'une est en cours', () => {
    etats.lister.mockReturnValue(of([]));
    const f = creer();
    f.componentInstance.enGeneration.set(true);
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
