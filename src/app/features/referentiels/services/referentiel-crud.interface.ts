import { Observable } from 'rxjs';

// Contrat generique de tout service CRUD de referentiel simple.
// Permet au composant generique d'accepter n'importe quel service compatible.
export interface ReferentielCrudService<TResponse, TRequest> {
  lister(): Observable<TResponse[]>;
  creer(request: TRequest): Observable<TResponse>;
  modifier(id: string, request: TRequest): Observable<TResponse>;
  supprimer(id: string): Observable<void>;
}
