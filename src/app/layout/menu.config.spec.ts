import { MENU_PRINCIPAL, trouverEmplacement } from './menu.config';

describe('menu', () => {
  it('place le tableau de bord en premiere entree', () => {
    expect(MENU_PRINCIPAL[0].titre).toBe('Pilotage');
    expect(MENU_PRINCIPAL[0].items[0].route).toBe('/tableau-de-bord');
  });

  it('garde les quatre rubriques dans l ordre attendu', () => {
    expect(MENU_PRINCIPAL.map((s) => s.titre)).toEqual(['Pilotage', 'Registre', 'Traitement', 'Administration']);
  });

  describe('trouverEmplacement (fil d Ariane)', () => {
    it('trouve une page du menu', () => {
      expect(trouverEmplacement('/validation')).toEqual({ rubrique: 'Traitement', page: 'Validation', route: '/validation' });
    });

    it('prefere la route la plus precise', () => {
      expect(trouverEmplacement('/personnes/recherche')?.page).toBe('Recherche avancée');
      expect(trouverEmplacement('/personnes/nouveau')?.page).toBe('Nouvelle personne');
      expect(trouverEmplacement('/personnes')?.page).toBe('Identification personnes');
    });

    it('retombe sur la page parente pour une fiche', () => {
      expect(trouverEmplacement('/dossiers/01a0f1')?.page).toBe('Gestion des dossiers');
      expect(trouverEmplacement('/personnes/01a0f1?onglet=3')?.page).toBe('Identification personnes');
    });

    it('ignore les adresses hors menu', () => {
      expect(trouverEmplacement('/inconnu')).toBeNull();
    });
  });
});
