import { Component, inject, signal } from '@angular/core';
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
import { TypeInfractionService } from '../../services/type-infraction.service';
import { TypeInfractionResponse } from '../../models/referentiel.models';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { TypeInfractionDialog } from '../type-infraction-dialog/type-infraction-dialog';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';

@Component({
  selector: 'app-types-infraction-page',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatTooltipModule, NomAccessibleInfobulle, MatProgressSpinnerModule,
    LucideAngularModule,
    PageHeader, StatusBadge, EmptyState
  ],
  templateUrl: './types-infraction-page.html',
  styleUrl: './types-infraction-page.scss'
})
export class TypesInfractionPage {
  private readonly service = inject(TypeInfractionService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  readonly items = signal<TypeInfractionResponse[]>([]);
  readonly chargement = signal(true);
  readonly colonnesAffichees = ['libelle', 'categorie', 'actif', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Plus, Pencil, Trash2 };

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.service.lister().subscribe({
      next: (data) => {
        this.items.set(data);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger');
        this.chargement.set(false);
      }
    });
  }

  ouvrir(item: TypeInfractionResponse | null): void {
    const ref = this.dialog.open(TypeInfractionDialog, { data: item, width: '600px' });
    ref.afterClosed().subscribe((request) => {
      if (!request) return;
      const operation$ = item
        ? this.service.modifier(item.id, request)
        : this.service.creer(request);
      operation$.subscribe({
        next: () => {
          this.toastr.success(item ? 'Type modifie' : 'Type cree');
          this.charger();
        },
        error: () => this.toastr.error("Échec de l'opération")
      });
    });
  }

  supprimer(item: TypeInfractionResponse): void {
    this.confirmation.demander({
      titre: 'Supprimer le type',
      message: `Supprimer "${item.libelle}" ?`,
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.supprimer(item.id).subscribe({
        next: () => {
          this.toastr.success('Type supprime');
          this.charger();
        },
        error: () => this.toastr.error('Suppression impossible')
      });
    });
  }
}
