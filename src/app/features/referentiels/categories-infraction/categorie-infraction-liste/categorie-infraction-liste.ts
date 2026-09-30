import { Component, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Plus, Pencil, Trash2, FolderTree, LucideIconData } from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { CategorieInfractionService } from '../../services/categorie-infraction.service';
import { CategorieInfractionResponse } from '../../models/referentiel.models';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { CategorieInfractionFormDialog } from '../categorie-infraction-form-dialog/categorie-infraction-form-dialog';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';

@Component({
  selector: 'app-categorie-infraction-liste',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconButton, MatTooltipModule, NomAccessibleInfobulle, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, EmptyState
  ],
  templateUrl: './categorie-infraction-liste.html',
  styleUrl: './categorie-infraction-liste.scss'
})
export class CategorieInfractionListe {
  private readonly service = inject(CategorieInfractionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  readonly categories = signal<CategorieInfractionResponse[]>([]);
  readonly chargement = signal(true);
  readonly colonnesAffichees = ['libelle', 'description', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Plus, Pencil, Trash2, FolderTree };

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.lister().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les categories');
        this.chargement.set(false);
      }
    });
  }

  ouvrir(categorie: CategorieInfractionResponse | null): void {
    const ref = this.dialog.open(CategorieInfractionFormDialog, {
      data: categorie,
      width: '500px'
    });

    ref.afterClosed().subscribe((request) => {
      if (!request) return;

      const operation$ = categorie
        ? this.service.modifier(categorie.id, request)
        : this.service.creer(request);

      operation$.subscribe({
        next: () => {
          this.toastr.success(categorie ? 'Categorie modifiee' : 'Categorie creee');
          this.charger();
        },
        error: () => this.toastr.error("Echec de l'operation")
      });
    });
  }

  supprimer(categorie: CategorieInfractionResponse): void {
    this.confirmation.demander({
      titre: 'Supprimer la categorie',
      message: `Supprimer la categorie "${categorie.libelle}" ?`,
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.supprimer(categorie.id).subscribe({
        next: () => {
          this.toastr.success('Categorie supprimee');
          this.charger();
        },
        error: () => this.toastr.error('Suppression impossible')
      });
    });
  }
}
