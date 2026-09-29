import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const auth = { login: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(() => {
    auth.login.mockReset();
    router.navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('relance la connexion sur un 401 de l\'API', () => {
    http.get(`${environment.apiUrl}/x`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/x`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('redirige vers /acces-refuse sur un 403 de l\'API', () => {
    http.get(`${environment.apiUrl}/x`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/x`).flush('', { status: 403, statusText: 'Forbidden' });
    expect(router.navigate).toHaveBeenCalledWith(['/acces-refuse']);
  });

  it('ignore les 401 provenant d\'une URL tierce', () => {
    http.get('https://tiers.example/x').subscribe({ error: () => undefined });
    controller.expectOne('https://tiers.example/x').flush('', { status: 401, statusText: 'Unauthorized' });
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('propage toujours l\'erreur au composant appelant', () => {
    let statut = 0;
    http.get(`${environment.apiUrl}/x`).subscribe({ error: (e) => (statut = e.status) });
    controller.expectOne(`${environment.apiUrl}/x`).flush('', { status: 500, statusText: 'Server Error' });
    expect(statut).toBe(500);
  });
});
