import { HttpErrorResponse } from '@angular/common/http';
import { messageErreurHttp } from './http-error.util';

const erreur = (corps: unknown) => new HttpErrorResponse({ status: 400, error: corps });

describe('messageErreurHttp', () => {
  it('renvoie la premiere erreur de champ quand la validation echoue (format Spring, au premier niveau)', () => {
    const e = erreur({ detail: 'Erreurs de validation', erreurs: { nomNaissance: 'Le nom de naissance est obligatoire' } });
    expect(messageErreurHttp(e, 'defaut')).toBe('Le nom de naissance est obligatoire');
  });

  it('lit toujours l\'ancien format properties.erreurs', () => {
    const e = erreur({ properties: { erreurs: { sexe: 'Le sexe est obligatoire' } } });
    expect(messageErreurHttp(e, 'defaut')).toBe('Le sexe est obligatoire');
  });

  it('utilise detail puis message', () => {
    expect(messageErreurHttp(erreur({ detail: 'Dossier introuvable' }), 'defaut')).toBe('Dossier introuvable');
    expect(messageErreurHttp(erreur({ message: 'La valeur existe deja' }), 'defaut')).toBe('La valeur existe deja');
  });

  it('retombe sur le message par defaut sans corps exploitable', () => {
    expect(messageErreurHttp(erreur(null), 'defaut')).toBe('defaut');
    expect(messageErreurHttp(erreur('<html>502</html>'), 'defaut')).toBe('defaut');
    expect(messageErreurHttp(undefined, 'defaut')).toBe('defaut');
  });
});
