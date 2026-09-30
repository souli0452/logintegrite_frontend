import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Plus, Pencil, Trash2, IdCard, ArrowLeft,
  LucideIconData
} from 'lucide-angular';

import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import { TypePieceIdentiteService } from '../../services/type-piece-identite.service';
import {
  TypePieceIdentiteResponse,
  TypePieceIdentiteRequest
} from '../../models/referentiel.models';

import {
  TypePieceIdentiteFormDialog,
  DonneesTypePieceIdentiteDialog
} from './type-piece-identite-form-dialog/type-piece-identite-form-dialog';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';
@Component({
  selector: 'app-type-piece-identite-liste',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, NomAccessibleInfobulle, MatSlideToggleModule,
    LucideAngularModule
  ],
  templateUrl: './type-piece-identite-liste.html',
  styleUrl: './type-piece-identite-liste.scss'
})
export class TypePieceIdentiteListe implements OnInit {
  private readonly service = inject(TypePieceIdentiteService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);

  readonly icons: Record<string, LucideIconData> = {
    Plus, Pencil, Trash2, IdCard, ArrowLeft
  };

  readonly types = signal<TypePieceIdentiteResponse[]>([]);
  readonly chargement = signal(true);
  readonly colonnes = ['code', 'libelle', 'actif', 'actions'];

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.service.lister().subscribe({
      next: (liste) => {
        this.types.set(liste);
        this.chargement.set(false);
      },
      error: (err) => {
        this.toastr.error(messageErreurHttp(err, 'Impossible de charger les types'));
        this.chargement.set(false);
      }
    });
  }

  retour(): void {
    this.router.navigate(['/referentiels']);
  }

  ouvrir(typePiece: TypePieceIdentiteResponse | null): void {
    const donnees: DonneesTypePieceIdentiteDialog = {
      mode: typePiece ? 'modification' : 'creation',
      typePiece: typePiece ?? undefined
    };
    const ref = this.dialog.open(TypePieceIdentiteFormDialog, {
      width: '560px',
      data: donnees
    });
    ref.afterClosed().subscribe((request: TypePieceIdentiteRequest | undefined) => {
      if (!request) return;
      const operation$ = typePiece
        ? this.service.modifier(typePiece.id, request)
        : this.service.creer(request);

      operation$.subscribe({
        next: () => {
          this.toastr.success(typePiece ? 'Type modifié' : 'Type créé');
          this.charger();
        },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Opération impossible'))
      });
    });
  }

  basculerActif(typePiece: TypePieceIdentiteResponse): void {
    const request: TypePieceIdentiteRequest = {
      code: typePiece.code,
      libelle: typePiece.libelle,
      actif: !typePiece.actif
    };
    this.service.modifier(typePiece.id, request).subscribe({
      next: () => {
        this.toastr.success(typePiece.actif ? 'Type désactivé' : 'Type activé');
        this.charger();
      },
      error: (err) => this.toastr.error(messageErreurHttp(err, 'Modification impossible'))
    });
  }

  supprimer(typePiece: TypePieceIdentiteResponse): void {
    this.confirmation.demander({
      titre: 'Supprimer le type',
      message: `Supprimer définitivement "${typePiece.libelle}" (code : ${typePiece.code}) ?`,
      detail: 'Un type utilisé par des pièces d\'identité existantes ne peut pas être supprimé. Préférez la désactivation.',
      libelleConfirmer: 'Supprimer',
      danger: true
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.supprimer(typePiece.id).subscribe({
        next: () => {
          this.toastr.success('Type supprimé');
          this.charger();
        },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Suppression impossible'))
      });
    });
  }
}
