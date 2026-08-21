import { Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import {
  LucideAngularModule,
  Search,
  Bell,
  LogOut,
  User,
  LucideIconData
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';

interface RoleAffichage {
  libelle: string;
  classe: string;
}

const ROLES_CONNUES: Record<string, RoleAffichage> = {
  ADMIN: { libelle: 'Administrateur', classe: 'role-badge--admin' },
  VALIDATEUR: { libelle: 'Validateur', classe: 'role-badge--validateur' },
  AGENT: { libelle: 'Agent', classe: 'role-badge--agent' }
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatMenuModule, MatButtonModule, MatBadgeModule, LucideAngularModule, NgClass],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {
  readonly auth = inject(AuthService);
  readonly icons: Record<string, LucideIconData> = { Search, Bell, LogOut, User };

  readonly roleAffiche = computed<RoleAffichage>(() => {
    const roles = this.auth.roles();
    const connu = roles.find((r) => r in ROLES_CONNUES);
    return connu ? ROLES_CONNUES[connu] : { libelle: 'Utilisateur', classe: 'role-badge--agent' };
  });
}
