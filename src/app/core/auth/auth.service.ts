import { Injectable, signal } from '@angular/core';
import { keycloakInstance } from './keycloak-init';

// Sous-ensemble des claims JWT qu'on utilise reellement.
interface KeycloakTokenClaims {
  preferred_username?: string;
  email?: string;
  realm_access?: {
    roles?: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);
  readonly username = signal<string | null>(null);
  readonly roles = signal<string[]>([]);

  constructor() {
    this.rafraichirEtat();
    keycloakInstance.onAuthSuccess = () => this.rafraichirEtat();
    keycloakInstance.onAuthLogout = () => this.rafraichirEtat();
    keycloakInstance.onTokenExpired = () => keycloakInstance.updateToken(30);
  }

  login(): Promise<void> {
    return keycloakInstance.login({ redirectUri: window.location.origin });
  }

  logout(): Promise<void> {
    return keycloakInstance.logout({ redirectUri: window.location.origin });
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role.toUpperCase());
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  getToken(): string | undefined {
    return keycloakInstance.token;
  }

  private rafraichirEtat(): void {
    const authentifie = keycloakInstance.authenticated ?? false;
    this.isAuthenticated.set(authentifie);

    if (authentifie && keycloakInstance.tokenParsed) {
      const parsed = keycloakInstance.tokenParsed as KeycloakTokenClaims;
      this.username.set(parsed.preferred_username ?? parsed.email ?? null);
      const realmRoles = parsed.realm_access?.roles ?? [];
      this.roles.set(realmRoles.map((r) => r.toUpperCase()));
    } else {
      this.username.set(null);
      this.roles.set([]);
    }
  }
}
