import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { FrenchDateAdapter, provideFrenchDateAdapter } from './french-date-adapter';

describe('FrenchDateAdapter', () => {
  let adaptateur: DateAdapter<Date>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFrenchDateAdapter()] });
    adaptateur = TestBed.inject(DateAdapter);
  });

  it('est bien l\'adaptateur francais', () => {
    expect(adaptateur).toBeInstanceOf(FrenchDateAdapter);
  });

  it('lit jj/mm/aaaa avec le jour en premier', () => {
    const d = adaptateur.parse('15/06/2026', null) as Date;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 6, 15]);

    const ambigu = adaptateur.parse('02/03/1975', null) as Date; // 2 mars, pas le 3 fevrier
    expect([ambigu.getMonth() + 1, ambigu.getDate()]).toEqual([3, 2]);
  });

  it('accepte les separateurs - et . ainsi que l\'ISO', () => {
    for (const saisie of ['15-06-2026', '15.06.2026', '2026-06-15', '  15/6/2026  ']) {
      const d = adaptateur.parse(saisie, null) as Date;
      expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 6, 15]);
    }
  });

  it('refuse les dates inexistantes et les saisies incoherentes', () => {
    for (const saisie of ['31/02/2026', '32/01/2026', '15/13/2026', 'demain', '2026/06/15/']) {
      expect(adaptateur.isValid(adaptateur.parse(saisie, null) as Date)).toBe(false);
    }
  });

  it('renvoie null pour une saisie vide', () => {
    expect(adaptateur.parse('   ', null)).toBeNull();
  });

  it('affiche les dates au format francais jj/mm/aaaa', () => {
    expect(adaptateur.format(new Date(2026, 5, 15), { year: 'numeric', month: 'numeric', day: 'numeric' })).toBe('15/06/2026');
  });
});
