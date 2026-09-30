import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import {
  LucideAngularModule, UserPlus, Users, MoreVertical, Shield, ShieldOff,
  Trash2, UserCheck, UserX, Search, Mail, LucideIconData
} from 'lucide-angular';

import { UtilisateurService } from '../services/utilisateur.service';
import { RoleHabilitationService } from '../services/role-habilitation.service';
import {
  UtilisateurResponse, RoleHabilitationResponse
} from '../models/utilisateur.models';
import { ConfirmationService } from '../../../shared/services/confirmation.service';
import { CreerUtilisateurDialog } from '../creer-utilisateur-dialog/creer-utilisateur-dialog';

type FiltreStatut = 'TOUS' | 'ACTIFS' | 'INACTIFS';

@Component({
  selector: 'app-administration-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatMenuModule, MatProgressSpinnerModule, MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './administration-page.html',
  styleUrl: './administration-page.scss'
})
export class AdministrationPage implements OnDestroy {
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly roleService = inject(RoleHabilitationService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  readonly icons: Record<string, LucideIconData> = {
    UserPlus, Users, MoreVertical, Shield, ShieldOff,
    Trash2, UserCheck, UserX, Search, Mail
  };

  // Etat
  readonly utilisateurs = signal<UtilisateurResponse[]>([]);
  readonly rolesDisponibles = signal<RoleHabilitationResponse[]>([]);
  readonly chargement = signal(true);
  readonly filtreStatut = signal<FiltreStatut>('TOUS');

  // Recherche
  readonly rechercheControl = this.fb.control('');
  private readonly rechercheSignal = toSignal(this.rechercheControl.valueChanges, { initialValue: '' });

  // Utilisateurs filtres
  readonly utilisateursFiltres = computed<UtilisateurResponse[]>(() => {
    const statut = this.filtreStatut();
    const terme = (this.rechercheSignal() ?? '').toLowerCase().trim();
    return this.utilisateurs().filter(u => {
      if (statut === 'ACTIFS' && !u.actif) return false;
      if (statut === 'INACTIFS' && u.actif) return false;
      if (terme && !`${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(terme)) return false;
      return true;
    });
  });

  // Stats
  readonly totalUtilisateurs = computed(() => this.utilisateurs().length);
  readonly totalActifs = computed(() => this.utilisateurs().filter(u => u.actif).length);
  readonly totalInactifs = computed(() => this.utilisateurs().filter(u => !u.actif).length);

  private readonly subs: Subscription[] = [];

  constructor() {
    this.charger();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  charger(): void {
    this.chargement.set(true);
    this.subs.push(
      forkJoin({
        users: this.utilisateurService.lister(),
        roles: this.roleService.lister()
      }).subscribe({
        next: (data) => {
          this.utilisateurs.set(data.users);
          this.rolesDisponibles.set(data.roles);
          this.chargement.set(false);
        },
        error: () => {
          this.toastr.error('Impossible de charger les utilisateurs');
          this.chargement.set(false);
        }
      })
    );
  }

  // ===== Filtres =====
  changerFiltre(statut: FiltreStatut): void {
    this.filtreStatut.set(statut);
  }

  // ===== Creation =====
  ouvrirDialogCreation(): void {
    const ref = this.dialog.open(CreerUtilisateurDialog, {
      width: '520px',
      maxWidth: '95vw',
      data: { rolesDisponibles: this.rolesDisponibles() }
    });
    ref.afterClosed().subscribe((cree: UtilisateurResponse | undefined) => {
      if (cree) {
        this.utilisateurs.update(list => [cree, ...list]);
        this.toastr.success(`Utilisateur ${cree.prenom} ${cree.nom} créé`);
      }
    });
  }

  // ===== Actions =====
  basculerActivation(u: UtilisateurResponse): void {
    const nouvelleActivation = !u.actif;
    const libelle = nouvelleActivation ? 'activer' : 'désactiver';

    this.confirmation.demander({
      titre: `${nouvelleActivation ? 'Activer' : 'Désactiver'} l'utilisateur`,
      message: `Vous êtes sur le point de ${libelle} le compte de ${u.prenom} ${u.nom}.`,
      libelleConfirmer: nouvelleActivation ? 'Activer' : 'Désactiver'
    }).subscribe(confirme => {
      if (!confirme) return;
      this.utilisateurService.modifierActivation(u.id, nouvelleActivation).subscribe({
        next: (maj) => {
          this.utilisateurs.update(list => list.map(x => x.id === u.id ? maj : x));
          this.toastr.success(`Utilisateur ${libelle}`);
        },
        error: () => this.toastr.error(`Impossible de ${libelle} l'utilisateur`)
      });
    });
  }

  supprimer(u: UtilisateurResponse): void {
    this.confirmation.demander({
      titre: 'Supprimer l\'utilisateur',
      message: `Cette action supprimera définitivement le compte de ${u.prenom} ${u.nom} du système ET de Keycloak. Cette opération est irréversible.`,
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe(confirme => {
      if (!confirme) return;
      this.utilisateurService.supprimer(u.id).subscribe({
        next: () => {
          this.utilisateurs.update(list => list.filter(x => x.id !== u.id));
          this.toastr.success('Utilisateur supprimé');
        },
        error: () => this.toastr.error('Suppression impossible')
      });
    });
  }

  attribuerRole(u: UtilisateurResponse, role: RoleHabilitationResponse): void {
    this.utilisateurService.attribuerRole(u.id, role.id).subscribe({
      next: (maj) => {
        this.utilisateurs.update(list => list.map(x => x.id === u.id ? maj : x));
        this.toastr.success(`Rôle ${role.libelle} attribué`);
      },
      error: () => this.toastr.error('Attribution impossible')
    });
  }

  retirerRole(u: UtilisateurResponse, role: RoleHabilitationResponse): void {
    this.utilisateurService.retirerRole(u.id, role.id).subscribe({
      next: (maj) => {
        this.utilisateurs.update(list => list.map(x => x.id === u.id ? maj : x));
        this.toastr.success(`Rôle ${role.libelle} retiré`);
      },
      error: () => this.toastr.error('Retrait impossible')
    });
  }

  // ===== Helpers =====
  initiales(u: UtilisateurResponse): string {
    return `${(u.prenom?.[0] ?? '').toUpperCase()}${(u.nom?.[0] ?? '').toUpperCase()}`;
  }

  couleurAvatar(u: UtilisateurResponse): string {
    // Couleur deterministe basee sur l'id
    const hash = u.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const couleurs = ['#16A34A', '#EE1D23', '#FFDC01', '#4a4a48', '#007a33'];
    return couleurs[hash % couleurs.length];
  }

  rolesNonAttribues(u: UtilisateurResponse): RoleHabilitationResponse[] {
    const codesAttribues = new Set(u.roles.map(r => r.code));
    return this.rolesDisponibles().filter(r => !codesAttribues.has(r.code));
  }

  couleurBadgeRole(code: string): string {
    switch (code) {
      case 'ADMIN': return 'admin';
      case 'VALIDATEUR': return 'validateur';
      case 'AGENT': return 'agent';
      case 'CONSULTANT': return 'consultant';
      default: return 'default';
    }
  }
}
