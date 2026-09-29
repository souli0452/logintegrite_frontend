import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  const dialogRef = { close: vi.fn() };

  function creer(data: ConfirmDialogData) {
    dialogRef.close.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    });
    return TestBed.createComponent(ConfirmDialog);
  }

  it('affiche le titre et le message demandes', () => {
    const fixture = creer({ titre: 'Archiver la fiche ?', message: 'Cette action est irreversible.' });
    fixture.detectChanges();

    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('Archiver la fiche ?');
    expect(texte).toContain('Cette action est irreversible.');
  });

  it('ferme avec true quand on confirme', () => {
    const fixture = creer({ titre: 't', message: 'm' });
    fixture.componentInstance.confirmer();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('ferme avec false quand on annule', () => {
    const fixture = creer({ titre: 't', message: 'm' });
    fixture.componentInstance.annuler();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
