import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';                           // 🆕
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule, Plus, Pencil, Trash2, ArrowLeft,             // 🆕 ArrowLeft
  LucideIconData
} from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ReferentielCrudService } from '../../services/referentiel-crud.interface';
import { ReferentielSimpleDialog } from '../referentiel-simple-dialog/referentiel-simple-dialog';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';

interface ItemGenerique {
  id: string;
  libelle: string;
  actif?: boolean;
}

@Component({
  selector: 'app-referentiel-simple-liste',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, StatusBadge, EmptyState
  ],
  templateUrl: './referentiel-simple-liste.html',
  styleUrl: './referentiel-simple-liste.scss'
})
export class ReferentielSimpleListe {
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);                         // 🆕

  // Inputs signals - le composant est completement pilote depuis l'exterieur
  readonly titrePage = input.required<string>();
  readonly sousTitrePage = input<string>('');
  readonly libelleSingulier = input.required<string>();
  readonly service = input.required<ReferentielCrudService<ItemGenerique, {libelle: string; actif?: boolean}>>();
  readonly avecActif = input<boolean>(false);

  // 🆕 Bouton retour : par défaut vers le hub des référentiels.
  //    Passez retourVers="" pour masquer le bouton.
  readonly retourVers = input<string>('/referentiels');
  readonly retourLibelle = input<string>('Retour au hub des référentiels');

  readonly items = signal<ItemGenerique[]>([]);
  readonly chargement = signal(true);
  readonly colonnesAffichees = ['libelle', 'actif', 'actions'];

  readonly icons: Record<string, LucideIconData> = {
    Plus, Pencil, Trash2, ArrowLeft                                 // 🆕 ArrowLeft
  };

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service().lister().subscribe({
      next: (data) => {
        this.items.set(data);
        this.chargement.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger les donnees';
        this.toastr.error(message);
        this.chargement.set(false);
      }
    });
  }

  // 🆕 Navigation retour
  retour(): void {
    if (this.retourVers()) {
      this.router.navigateByUrl(this.retourVers());
    }
  }

  ouvrir(item: ItemGenerique | null): void {
    const ref = this.dialog.open(ReferentielSimpleDialog, {
      data: {
        titre: this.libelleSingulier(),
        edition: item,
        avecActif: this.avecActif()
      },
      width: '500px'
    });
    ref.afterClosed().subscribe((request) => {
      if (!request) return;
      const operation$ = item
        ? this.service().modifier(item.id, request)
        : this.service().creer(request);
      operation$.subscribe({
        next: () => {
          this.toastr.success(item ? 'Modifie avec succes' : 'Cree avec succes');
          this.charger();
        },
        error: (err) => {
          const message = err?.error?.message ?? "Echec de l'operation";
          this.toastr.error(message);
        }
      });
    });
  }

  supprimer(item: ItemGenerique): void {
    this.confirmation.demander({
      titre: `Supprimer ${this.libelleSingulier()}`,
      message: `Supprimer "${item.libelle}" ?`,
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service().supprimer(item.id).subscribe({
        next: () => {
          this.toastr.success('Supprime avec succes');
          this.charger();
        },
        error: (err) => {
          const message = err?.error?.message ?? 'Suppression impossible';
          this.toastr.error(message);
        }
      });
    });
  }
}
