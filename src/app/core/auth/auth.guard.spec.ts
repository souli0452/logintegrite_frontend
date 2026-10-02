import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { roleGuard } from './auth.guard';

describe('roleGuard', () => {
  const router = { navigate: vi.fn() };
  const auth = { isAuthenticated: vi.fn(), hasAnyRole: vi.fn(), hasRole: vi.fn(), login: vi.fn(), pageAccueil: vi.fn() };

  function executer(...roles: string[]): unknown {
    return TestBed.runInInjectionContext(() =>
      roleGuard(...roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    Object.values(auth).forEach((f) => f.mockReset());
    router.navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('renvoie vers Keycloak si l\'utilisateur n\'est pas connecte', () => {
    auth.isAuthenticated.mockReturnValue(false);
    expect(executer('ADMIN')).toBe(false);
    expect(auth.login).toHaveBeenCalled();
  });

  it('autorise un utilisateur qui a un des roles requis', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    expect(executer('AGENT', 'ADMIN')).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ramene un CONSULTANT vers sa page d accueil (la verification d une personne)', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(false);
    auth.hasRole.mockImplementation((r: string) => r === 'CONSULTANT');
    auth.pageAccueil.mockReturnValue('/verification');
    expect(executer('ADMIN')).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/verification']);
  });

  it('envoie tout autre utilisateur sans droit vers /acces-refuse', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(false);
    auth.hasRole.mockReturnValue(false);
    expect(executer('ADMIN')).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/acces-refuse']);
  });
});
