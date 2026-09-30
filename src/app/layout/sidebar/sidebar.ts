import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Search,
  FolderOpen,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  UserPlus,
  FileText,
  Database,
  UserCog,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
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
}

interface MenuSection {
  titre: string;
  items: MenuItem[];
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

  readonly icons: Record<string, LucideIconData> = { ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen };

  private readonly groupesOuverts = signal<Set<string>>(new Set(['Gestion des personnes']));

  /** Le menu suit le parcours de travail : consulter le registre, traiter les dossiers, piloter, administrer. */
  private readonly menu: MenuSection[] = [
    {
      titre: 'Registre',
      items: [
        { route: '/registre-officiel', label: 'Répertoire officiel', icone: ShieldCheck },
        {
          label: 'Gestion des personnes',
          icone: Users,
          roles: ['AGENT', 'ADMIN'],
          enfants: [
            { route: '/personnes/nouveau', label: 'Nouvelle personne', icone: UserPlus },
            { route: '/personnes', label: 'Identification personnes', icone: Users }
          ]
        },
        { route: '/personnes/recherche', label: 'Recherche avancée', icone: Search }
      ]
    },
    {
      titre: 'Traitement',
      items: [
        { route: '/dossiers', label: 'Gestion des dossiers', icone: FolderOpen, roles: ['AGENT', 'ADMIN'] },
        { route: '/validation', label: 'Validation', icone: CheckSquare, roles: ['VALIDATEUR', 'ADMIN'] }
      ]
    },
    {
      titre: 'Pilotage',
      items: [
        { route: '/tableau-de-bord', label: 'Tableaux de bord', icone: LayoutDashboard, roles: ['AGENT', 'VALIDATEUR', 'ADMIN'] },
        { route: '/rapports', label: 'Rapports', icone: FileText, roles: ['AGENT', 'VALIDATEUR', 'ADMIN'] }
      ]
    },
    {
      titre: 'Administration',
      items: [
        { route: '/referentiels', label: 'Référentiels', icone: Database, roles: ['ADMIN'] },
        { route: '/administration', label: 'Gestion des utilisateurs', icone: UserCog, roles: ['ADMIN'] },
        { route: '/audit', label: 'Audit des actions', icone: ScrollText, roles: ['ADMIN'] }
      ]
    }
  ];

  readonly sectionsVisibles = computed<MenuSection[]>(() =>
    this.menu
      .map((section) => ({
        titre: section.titre,
        items: section.items
          .filter((item) => !item.roles || this.auth.hasAnyRole(...item.roles))
          .map((item) => item.enfants
            ? { ...item, enfants: item.enfants.filter((e) => !e.roles || this.auth.hasAnyRole(...e.roles)) }
            : item)
      }))
      .filter((section) => section.items.length > 0)
  );

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
}
