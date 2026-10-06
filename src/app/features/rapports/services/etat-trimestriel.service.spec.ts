import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { EtatTrimestrielService, libelleTrimestre, trimestresTermines } from './etat-trimestriel.service';

describe('EtatTrimestrielService', () => {
  let service: EtatTrimestrielService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/rapports/etats-trimestriels`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EtatTrimestrielService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('liste les etats archives', () => {
    let recu: unknown;
    service.lister().subscribe(r => (recu = r));
    http.expectOne(base).flush([{ id: 'a', annee: 2026, trimestre: 3 }]);
    expect(recu).toEqual([{ id: 'a', annee: 2026, trimestre: 3 }]);
  });

  it('telecharge le PDF et l\'Excel en blob', () => {
    service.pdf('a').subscribe();
    const r1 = http.expectOne(`${base}/a/pdf`);
    expect(r1.request.responseType).toBe('blob');
    r1.flush(new Blob());
    service.excel('a').subscribe();
    const r2 = http.expectOne(`${base}/a/excel`);
    expect(r2.request.responseType).toBe('blob');
    r2.flush(new Blob());
  });

  it('genere un etat avec annee et trimestre en parametres', () => {
    service.generer(2026, 3).subscribe();
    const req = http.expectOne(r => r.url === `${base}/generer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('annee')).toBe('2026');
    expect(req.request.params.get('trimestre')).toBe('3');
    req.flush(null);
  });
});

describe('trimestresTermines', () => {
  it('exclut le trimestre en cours et part du precedent', () => {
    const r = trimestresTermines(new Date(2026, 9, 6), 3);
    expect(r.map(t => t.libelle)).toEqual(['T3 2026', 'T2 2026', 'T1 2026']);
  });

  it('traverse le changement d\'annee', () => {
    const r = trimestresTermines(new Date(2026, 0, 15), 3);
    expect(r.map(t => t.libelle)).toEqual(['T4 2025', 'T3 2025', 'T2 2025']);
  });

  it('formate le libelle', () => {
    expect(libelleTrimestre(2026, 3)).toBe('T3 2026');
  });
});
