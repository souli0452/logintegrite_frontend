import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { keycloakInstance } from '../auth/keycloak-init';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  function configurer(authentifie: boolean): void {
    vi.spyOn(keycloakInstance, 'updateToken').mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => authentifie, getToken: () => 'jeton-test' } }
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
  });

  it('joint le jeton aux appels vers l\'API', async () => {
    configurer(true);
    http.get(`${environment.apiUrl}/personnes`).subscribe();
    await vi.waitFor(() => controller.expectOne(`${environment.apiUrl}/personnes`));
  });

  it('ne joint JAMAIS le jeton a une URL tierce', () => {
    configurer(true);
    http.get('https://tiers.example/collecte').subscribe();
    const req = controller.expectOne('https://tiers.example/collecte');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('n\'ajoute rien si l\'utilisateur n\'est pas authentifie', () => {
    configurer(false);
    http.get(`${environment.apiUrl}/personnes`).subscribe();
    const req = controller.expectOne(`${environment.apiUrl}/personnes`);
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('place le header Authorization Bearer sur les appels API authentifies', async () => {
    configurer(true);
    http.get(`${environment.apiUrl}/personnes`).subscribe();
    const req = await vi.waitFor(() => controller.expectOne(`${environment.apiUrl}/personnes`));
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton-test');
  });
});
