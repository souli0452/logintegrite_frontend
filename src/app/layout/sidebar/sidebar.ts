import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  LucideAngularModule,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIconData
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarStateService } from '../../core/services/sidebar-state.service';
import { MENU_PRINCIPAL, MenuSection } from '../menu.config';

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

  private readonly router = inject(Router);
  /** Groupes ouverts a la main ; un groupe s'ouvre aussi tout seul quand on est dans l'une de ses pages. */
  private readonly groupesOuverts = signal<Set<string>>(new Set());
  private readonly urlCourante = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map((e) => e.urlAfterRedirects), startWith(this.router.url)),
    { initialValue: this.router.url });

  /** Definition partagee avec le fil d'Ariane de la barre du haut (voir menu.config.ts). */
  private readonly menu: MenuSection[] = MENU_PRINCIPAL;

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

  /** Groupe que l'utilisateur vient de refermer alors qu'il contient la page courante : reste ferme jusqu'a la prochaine navigation. */
  private readonly fermeManuellement = signal<{ label: string; url: string } | null>(null);

  estOuvert(label: string): boolean {
    const ferme = this.fermeManuellement();
    if (ferme && ferme.label === label && ferme.url === this.urlCourante()) return false;
    return this.groupesOuverts().has(label) || this.groupeContientLaPage(label);
  }

  /** Vrai si la page courante appartient a ce groupe (la route du menu la plus precise gagne : /personnes/recherche n'est pas dans "Gestion des personnes"). */
  private groupeContientLaPage(label: string): boolean {
    const url = this.urlCourante().split('?')[0];
    const routes = this.menu.flatMap((section) => section.items.flatMap((item) => item.enfants ? item.enfants : [item]));
    const correspond = routes
      .filter((r) => r.route && (url === r.route || url.startsWith(r.route + '/')))
      .sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0))[0];
    if (!correspond) return false;
    const groupe = this.menu.flatMap((section) => section.items).find((item) => item.label === label);
    return !!groupe?.enfants?.some((e) => e.route === correspond.route);
  }

  basculerGroupe(label: string): void {
    if (this.estOuvert(label)) {
      this.groupesOuverts.update((s) => { const copie = new Set(s); copie.delete(label); return copie; });
      this.fermeManuellement.set({ label, url: this.urlCourante() });
    } else {
      this.fermeManuellement.set(null);
      this.groupesOuverts.update((s) => new Set(s).add(label));
    }
  }
}
