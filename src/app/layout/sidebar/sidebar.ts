import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Search,
  FolderOpen,
  CheckSquare,
  Settings,
  ClipboardList,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  UserPlus,
  FileText,
  LucideIconData
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';

interface MenuItem {
  route?: string;
  label: string;
  icone: LucideIconData;
  roles?: string[];
  enfants?: MenuItem[];
  principal?: boolean;   // Traitement visuel distinctif (entree principale de l'app)
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  readonly state = inject(SidebarStateService);

  readonly icons: Record<string, LucideIconData> = { ChevronRight, ChevronDown };

  private readonly groupesOuverts = signal<Set<string>>(new Set(['Gestion des personnes']));

  private readonly menu: MenuItem[] = [
  // ─── 1. Gestion des personnes (ex-"Fiches", devient parent avec 2 sous-menus) ───
  {
    label: 'Gestion des personnes',
    icone: Users,
    roles: ['AGENT', 'ADMIN'],
    enfants: [
      { route: '/personnes/nouveau', label: 'Nouvelle personne',        icone: UserPlus },
      { route: '/personnes',         label: 'Identification personnes', icone: Users }
    ]
  },

  // ─── 2. Répertoire officiel (ex-"Registre officiel", accessible à tous) ───
  {
    route: '/registre-officiel',
    label: 'Répertoire officiel',
    icone: ShieldCheck,
    principal: true
  },

  // ─── 3. Gestion des dossiers (ex-"Dossiers") ───
  {
    route: '/dossiers',
    label: 'Gestion des dossiers',
    icone: FolderOpen,
    roles: ['AGENT', 'ADMIN']
  },

  // ─── 4. Validation ───
  {
    route: '/validation',
    label: 'Validation',
    icone: CheckSquare,
    roles: ['VALIDATEUR', 'ADMIN']
  },

  // ─── 5. Tableaux de bord (ex-"Tableau de bord") ───
  {
    route: '/tableau-de-bord',
    label: 'Tableaux de bord',
    icone: LayoutDashboard,
    roles: ['AGENT', 'VALIDATEUR', 'ADMIN']
  },

  // ─── 6. Rapports ───
  {
    route: '/rapports',
    label: 'Rapports',
    icone: FileText,
    roles: ['AGENT', 'VALIDATEUR', 'ADMIN']
  },
  
    {
    route: '/personnes/recherche',
    label: 'Recherche avancée',
    icone: Search
  },

  // ─── 7. Référentiels ───
  { route: '/referentiels',   label: 'Référentiels',            icone: Settings,      roles: ['ADMIN'] },

  // ─── 8. Gestion des utilisateurs (ex-"Administration") ───
  { route: '/administration', label: 'Gestion des utilisateurs', icone: Settings,      roles: ['ADMIN'] },

  // ─── 9. Audit des actions (ex-"Audit") ───
  { route: '/audit',          label: 'Audit des actions',        icone: ClipboardList, roles: ['ADMIN'] }
];

  readonly menuVisible = computed<MenuItem[]>(() => {
    return this.menu
      .filter((item) => !item.roles || this.auth.hasAnyRole(...item.roles))
      .map((item) => {
        if (item.enfants) {
          return {
            ...item,
            enfants: item.enfants.filter((e) => !e.roles || this.auth.hasAnyRole(...e.roles))
          };
        }
        return item;
      });
  });

  estOuvert(label: string): boolean {
    return this.groupesOuverts().has(label);
  }

  basculerGroupe(label: string): void {
    this.groupesOuverts.update((s) => {
      const copie = new Set(s);
      if (copie.has(label)) copie.delete(label);
      else copie.add(label);
      return copie;
    });
  }

  // Repli au clavier uniquement quand le focus quitte reellement la sidebar
  // (et pas simplement en passant d'un lien a l'autre a l'interieur).
  onFocusOut(event: FocusEvent, hostElement: HTMLElement): void {
    const cible = event.relatedTarget as Node | null;
    if (!cible || !hostElement.contains(cible)) {
      this.state.reduire();
    }
  }
}
