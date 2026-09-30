import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, Eye, Trash2, UserPlus, LucideIconData } from 'lucide-angular';

import { DossierService } from '../../../../services/dossier.service';
import { ConfirmationService } from '../../../../../../shared/services/confirmation.service';
import { ImplicationResponse } from '../../../../models/dossier.models';
import {
  AjouterPersonneDossierDialog,
  DonneesDialogAjoutPersonne
} from '../../ajouter-personne-dossier-dialog/ajouter-personne-dossier-dialog';
import { NomAccessibleInfobulle } from '../../../../../../shared/a11y/nom-accessible-infobulle';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-onglet-dossier-implications',
  standalone: true,
  imports: [DatePipe, RouterLink, MatTableModule, MatButtonModule, MatTooltipModule, NomAccessibleInfobulle, LucideAngularModule],
  templateUrl: './onglet-dossier-implications.html',
  styleUrl: './onglet-dossier-implications.scss'
})
export class OngletDossierImplications {
  private readonly service = inject(DossierService);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);

  readonly dossierId = input.required<string>();
  readonly numeroDossier = input<string | undefined>();
  readonly dossierIntitule = input<string | undefined>();
  readonly implications = input.required<ImplicationResponse[]>();
  readonly dossierOuvert = input.required<boolean>();

  readonly implicationSupprimee = output<string>();
  readonly personneAjoutee = output<void>();

  readonly colonnes = ['personne', 'role', 'fonction', 'entite', 'periode', 'actions'];
  readonly icons: Record<string, LucideIconData> = { Eye, Trash2, UserPlus };

  // ─── Suppression (existant) ────────────────────────────────────────────────
  supprimer(implication: ImplicationResponse): void {
    this.confirmation.demander({
      titre: 'Retirer du dossier',
      message: `Retirer ${implication.personneNomAffichage} du dossier ?`,
      libelleConfirmer: 'Retirer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.supprimerImplication(this.dossierId(), implication.id).subscribe({
        next: () => {
          this.toastr.success('Personne retirée du dossier');
          this.implicationSupprimee.emit(implication.id);
        },
        error: () => this.toastr.error('Suppression impossible')
      });
    });
  }

  // ─── 🆕 Ouverture du dialog d'ajout ────────────────────────────────────────
  ouvrirAjoutPersonne(): void {
    const donnees: DonneesDialogAjoutPersonne = {
      dossierId: this.dossierId(),
      numeroDossier: this.numeroDossier(),
      dossierIntitule: this.dossierIntitule(),
      personnesDejaImpliqueesIds: this.implications().map(i => i.personneId)
    };

    const ref = this.dialog.open(AjouterPersonneDossierDialog, {
      data: donnees,
      panelClass: 'dialog-ajout-personne-panel',
      autoFocus: false,
      width: '720px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((ajoutee) => {
      if (ajoutee) this.personneAjoutee.emit();
    });
  }
}
