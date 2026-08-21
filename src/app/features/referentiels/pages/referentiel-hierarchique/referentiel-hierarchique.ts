import { Component, inject, input, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Plus, Pencil, Trash2, LucideIconData } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { ReferentielCrudService } from '../../services/referentiel-crud.interface';
import { HierarchieDialog, ItemHierarchique } from '../hierarchie-dialog/hierarchie-dialog';

@Component({
  selector: 'app-referentiel-hierarchique',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, StatusBadge, EmptyState
  ],
  templateUrl: './referentiel-hierarchique.html',
  styleUrl: './referentiel-hierarchique.scss'
})
export class ReferentielHierarchique {
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  // Composant entierement pilote depuis l'exterieur - meme principe que
  // ReferentielSimpleListe pour les referentiels a plat.
  readonly titrePage = input.required<string>();
  readonly sousTitrePage = input<string>('');
  readonly libelleSingulier = input.required<string>();          // "zone", "entite"
  readonly libelleSingulierComplet = input.required<string>();   // "zone geographique", "entite d'organisation"
  readonly niveaux = input.required<{ valeur: string; libelle: string }[]>();
  readonly service = input.required<ReferentielCrudService<ItemHierarchique, { libelle: string; niveau: string; parentId?: string }>>();

  readonly items = signal<ItemHierarchique[]>([]);
  readonly chargement = signal(true);
  readonly colonnesAffichees = ['libelle', 'niveau', 'parent', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Plus, Pencil, Trash2 };

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

  ouvrir(item: ItemHierarchique | null): void {
    // On ne peut pas etre son propre parent
    const parentsPossibles = this.items().filter((i) => (item ? i.id !== item.id : true));

    const ref = this.dialog.open(HierarchieDialog, {
      data: {
        titre: this.libelleSingulierComplet(),
        edition: item,
        niveaux: this.niveaux(),
        parentsPossibles
      },
      width: '600px'
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

  supprimer(item: ItemHierarchique): void {
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

  libelleParent(item: ItemHierarchique): string {
    if (!item.parentId) return '—';
    const parent = this.items().find((i) => i.id === item.parentId);
    return parent?.libelle ?? '—';
  }
}
