import { environment } from '../../../environments/environment';
import { estRequeteApi } from './api-url.util';

describe('estRequeteApi', () => {
  it('reconnait les URLs de notre API', () => {
    expect(estRequeteApi(`${environment.apiUrl}/personnes/recherche`)).toBe(true);
    expect(estRequeteApi(environment.apiUrl)).toBe(true);
  });

  it('refuse les URLs tierces', () => {
    expect(estRequeteApi('https://exemple.com/api/v1/x')).toBe(false);
    expect(estRequeteApi('/assets/logo.svg')).toBe(false);
  });

  it('refuse un domaine qui commence par la meme chaine que l\'API', () => {
    expect(estRequeteApi(`${environment.apiUrl}.pirate.example/x`)).toBe(false);
  });
});
