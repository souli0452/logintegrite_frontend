import { Component, ElementRef, HostListener, computed, inject, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  LucideAngularModule,
  Search,
  LogOut,
  ChevronRight,
  ChevronDown,
  LucideIconData
} from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { trouverEmplacement } from '../menu.config';

const LIBELLES_ROLES: Record<string, string> = {
  ADMIN: 'Administrateur',
  VALIDATEUR: 'Validateur',
  AGENT: 'Agent',
  CONSULTANT: 'Consultant'
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatMenuModule, MatButtonModule, LucideAngularModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly icons: Record<string, LucideIconData> = { Search, LogOut, ChevronRight, ChevronDown };

  private readonly champ = viewChild<ElementRef<HTMLInputElement>>('champ');

  private readonly urlCourante = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url)),
    { initialValue: this.router.url });

  /** Fil d'Ariane deduit du menu : "Registre > Identification personnes". */
  readonly filAriane = computed(() => trouverEmplacement(this.urlCourante()));

  /** Role principal, affiche en texte discret sous le nom. */
  readonly roleLibelle = computed(() => {
    const roles = this.auth.roles();
    const ordre = ['ADMIN', 'VALIDATEUR', 'AGENT', 'CONSULTANT'];
    const connu = ordre.find((r) => roles.includes(r));
    return connu ? LIBELLES_ROLES[connu] : 'Utilisateur';
  });

  /** Initiales de l'avatar : "abdoul.drabo" -> "AD". */
  readonly initiales = computed(() => {
    const nom = (this.auth.username() ?? '').trim();
    if (!nom) return '?';
    const parties = nom.split(/[.\s_-]+/).filter(Boolean);
    const lettres = parties.length > 1 ? parties[0][0] + parties[1][0] : nom.slice(0, 2);
    return lettres.toUpperCase();
  });

  /** Ouvre la recherche avancee avec le terme saisi. */
  rechercher(evenement: Event, terme: string): void {
    evenement.preventDefault();
    const q = terme.trim();
    void this.router.navigate(['/personnes/recherche'], q ? { queryParams: { q } } : {});
  }

  /** Raccourci "/" : place le curseur dans la recherche (sauf si l'on est deja en train de saisir). */
  @HostListener('document:keydown', ['$event'])
  surRaccourci(evenement: KeyboardEvent): void {
    if (evenement.key !== '/' || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
    const cible = evenement.target as HTMLElement | null;
    if (cible && (['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName) || cible.isContentEditable)) return;
    evenement.preventDefault();
    this.champ()?.nativeElement.focus();
  }
}
