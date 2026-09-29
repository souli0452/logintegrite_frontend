import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { keycloakInstance } from './keycloak-init';

describe('AuthService', () => {
  function connecte(roles: string[], username = 'awa.test'): AuthService {
    Object.assign(keycloakInstance, {
      authenticated: true,
      token: 'jeton-test',
      tokenParsed: { preferred_username: username, realm_access: { roles } }
    });
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    Object.assign(keycloakInstance, { authenticated: false, token: undefined, tokenParsed: undefined });
  });

  it('expose l\'identite et les roles de l\'utilisateur connecte', () => {
    const auth = connecte(['agent', 'offline_access']);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.username()).toBe('awa.test');
    expect(auth.roles()).toEqual(['AGENT', 'OFFLINE_ACCESS']);
    expect(auth.getToken()).toBe('jeton-test');
  });

  it('compare les roles sans tenir compte de la casse', () => {
    const auth = connecte(['VALIDATEUR']);

    expect(auth.hasRole('validateur')).toBe(true);
    expect(auth.hasRole('ADMIN')).toBe(false);
    expect(auth.hasAnyRole('ADMIN', 'VALIDATEUR')).toBe(true);
    expect(auth.hasAnyRole('ADMIN', 'AGENT')).toBe(false);
  });

  it('n\'a ni identite ni role quand personne n\'est connecte', () => {
    Object.assign(keycloakInstance, { authenticated: false, tokenParsed: undefined });
    const auth = TestBed.inject(AuthService);

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.username()).toBeNull();
    expect(auth.roles()).toEqual([]);
    expect(auth.hasAnyRole('ADMIN', 'AGENT')).toBe(false);
  });
});
