import {
  LayoutDashboard,
  Users,
  Search,
  FolderOpen,
  CheckSquare,
  ShieldCheck,
  UserPlus,
  FileText,
  Database,
  UserCog,
  ScrollText,
  ScanSearch,
  Inbox,
  CalendarClock,
  LucideIconData
} from 'lucide-angular';

/**
 * Definition UNIQUE du menu : le menu lateral l'affiche et la barre du haut en deduit le fil d'Ariane.
 * Il suit le parcours de travail : piloter, consulter le registre, traiter les dossiers, administrer.
 */
export interface MenuItem {
  route?: string;
  label: string;
  icone: LucideIconData;
  roles?: string[];
  enfants?: MenuItem[];
}

export interface MenuSection {
  titre: string;
  items: MenuItem[];
}

export const MENU_PRINCIPAL: MenuSection[] = [
  {
    // Pilotage en premier : le tableau de bord est toujours la premiere entree du menu
    titre: 'Pilotage',
    items: [
      { route: '/tableau-de-bord', label: 'Tableaux de bord', icone: LayoutDashboard, roles: ['AGENT', 'VALIDATEUR', 'ADMIN'] },
      { route: '/rapports', label: 'Rapports', icone: FileText, roles: ['AGENT', 'VALIDATEUR', 'ADMIN'] },
      { route: '/etats-trimestriels', label: 'États trimestriels', icone: CalendarClock, roles: ['VALIDATEUR', 'ADMIN'] }
    ]
  },
  {
    titre: 'Registre',
    items: [
      { route: '/registre-officiel', label: 'Répertoire officiel', icone: ShieldCheck, roles: ['AGENT', 'VALIDATEUR', 'ADMIN'] },
      {
        label: 'Gestion des personnes',
        icone: Users,
        roles: ['AGENT', 'ADMIN'],
        enfants: [
          { route: '/personnes/nouveau', label: 'Nouvelle personne', icone: UserPlus },
          { route: '/personnes', label: 'Identification personnes', icone: Users }
        ]
      },
      { route: '/personnes/recherche', label: 'Recherche avancée', icone: Search, roles: ['AGENT', 'ADMIN'] },
      // Porte d'entree d'un compte de consultation : une personne precise, jamais une liste
      { route: '/verification', label: 'Vérifier une personne', icone: ScanSearch },
      { route: '/verification/mes-demandes', label: 'Mes demandes de dossier', icone: Inbox, roles: ['CONSULTANT'] }
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
    // Tout ce qui releve de la configuration, reuni sous une seule rubrique
    titre: 'Administration',
    items: [
      { route: '/referentiels', label: 'Référentiels', icone: Database, roles: ['ADMIN'] },
      { route: '/administration', label: 'Gestion des utilisateurs', icone: UserCog, roles: ['ADMIN'] },
      { route: '/demandes-export', label: 'Demandes de dossier', icone: Inbox, roles: ['ADMIN'] },
      { route: '/audit', label: 'Audit des actions', icone: ScrollText, roles: ['ADMIN'] }
    ]
  }
];

export interface EmplacementMenu {
  rubrique: string;
  page: string;
  route: string;
}

/**
 * Entree du menu qui correspond a une adresse : la route la plus precise gagne
 * (/personnes/recherche est preferee a /personnes ; /dossiers/<id> retombe sur /dossiers).
 */
export function trouverEmplacement(url: string, menu: MenuSection[] = MENU_PRINCIPAL): EmplacementMenu | null {
  const chemin = url.split('?')[0].split('#')[0];
  let meilleur: EmplacementMenu | null = null;
  for (const section of menu) {
    for (const item of section.items) {
      for (const e of item.enfants ?? [item]) {
        if (!e.route) continue;
        const correspond = chemin === e.route || chemin.startsWith(e.route + '/');
        if (correspond && (!meilleur || e.route.length > meilleur.route.length)) {
          meilleur = { rubrique: section.titre, page: e.label, route: e.route };
        }
      }
    }
  }
  return meilleur;
}
