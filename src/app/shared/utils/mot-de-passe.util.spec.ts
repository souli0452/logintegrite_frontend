import { FormControl } from '@angular/forms';
import {
  genererMotDePasseSecurise,
  MOT_DE_PASSE_LONGUEUR_MIN,
  reglesMotDePasseManquantes,
  validerMotDePasse
} from './mot-de-passe.util';

describe('politique de mot de passe', () => {
  it('impose 12 caracteres minimum', () => {
    expect(MOT_DE_PASSE_LONGUEUR_MIN).toBe(12);
    expect(reglesMotDePasseManquantes('Abcdefg1234')).toContain('longueur'); // 11 caracteres
    expect(reglesMotDePasseManquantes('Abcdefgh1234')).not.toContain('longueur'); // 12 caracteres
  });

  it('impose une majuscule, une minuscule et un chiffre', () => {
    expect(reglesMotDePasseManquantes('abcdefghijkl1')).toEqual(['majuscule']);
    expect(reglesMotDePasseManquantes('ABCDEFGHIJKL1')).toEqual(['minuscule']);
    expect(reglesMotDePasseManquantes('Abcdefghijklm')).toEqual(['chiffre']);
    expect(reglesMotDePasseManquantes('Abcdefghijk1')).toEqual([]);
  });

  it('le validateur de formulaire refuse un mot de passe de 8 caracteres (ancienne regle)', () => {
    expect(validerMotDePasse(new FormControl('Abcd1234'))).toEqual({ motDePasse: ['longueur'] });
  });

  it('le validateur accepte un mot de passe conforme et ignore le champ vide', () => {
    expect(validerMotDePasse(new FormControl('Correct-Horse-9'))).toBeNull();
    expect(validerMotDePasse(new FormControl(''))).toBeNull();
  });
});

describe('genererMotDePasseSecurise', () => {
  it('produit toujours un mot de passe conforme (500 tirages)', () => {
    for (let i = 0; i < 500; i++) {
      const mdp = genererMotDePasseSecurise();
      expect(mdp.length).toBe(16);
      expect(reglesMotDePasseManquantes(mdp)).toEqual([]);
    }
  });

  it('ne descend jamais sous 12 caracteres, meme si on en demande moins', () => {
    expect(genererMotDePasseSecurise(4).length).toBe(MOT_DE_PASSE_LONGUEUR_MIN);
  });

  it('ne produit pas deux fois le meme mot de passe', () => {
    const tirages = new Set(Array.from({ length: 200 }, () => genererMotDePasseSecurise()));
    expect(tirages.size).toBe(200);
  });
});
