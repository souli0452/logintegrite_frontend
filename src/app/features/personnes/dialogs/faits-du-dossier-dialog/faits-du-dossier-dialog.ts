import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule, FileText, X, Info, CheckCircle2, Clock, XCircle,
  Star, Calendar, MapPin, Coins, Plus,
  LucideIconData
} from 'lucide-angular';

import { DossierService } from '../../../dossiers/services/dossier.service';
import { FaitReprocheResponse, ImplicationResponse } from '../../../dossiers/models/dossier.models';
import { ReprocherFaitDialog } from '../../pages/reprocher-fait-dialog/reprocher-fait-dialog';
import { NomAccessibleInfobulle } from '../../../../shared/a11y/nom-accessible-infobulle';

export interface DonneesDialogFaitsDossier {
  dossierId: string;
  dossierIntitule: string;
  numeroDossier?: string;
  personneCouranteId: string;
  personneCouranteNom: string;
  /** IDs des faits liés à la personne courante (via implicationFaits). */
  faitsPropresIds: string[];
  /** Implication de la personne dans ce dossier (pour ajouter un fait). */
  implicationCourante?: ImplicationResponse;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-faits-du-dossier-dialog',
  standalone: true,
  imports: [
    CommonModule, DatePipe, CurrencyPipe,
    MatDialogModule, MatProgressSpinnerModule, MatTooltipModule, NomAccessibleInfobulle,
    LucideAngularModule
  ],
  templateUrl: './faits-du-dossier-dialog.html',
  styleUrl: './faits-du-dossier-dialog.scss'
})
export class FaitsDuDossierDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<FaitsDuDossierDialog>);
  private readonly dialog = inject(MatDialog);
  private readonly dossierService = inject(DossierService);

  readonly data = inject<DonneesDialogFaitsDossier>(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = {
    FileText, X, Info, CheckCircle2, Clock, XCircle,
    Star, Calendar, MapPin, Coins, Plus
  };

  readonly faits = signal<FaitReprocheResponse[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  /** Set des IDs des faits propres à la personne — lookup rapide. */
  private readonly faitsPropresSet = computed(() => new Set(this.data.faitsPropresIds));

  /**
   * Uniquement les faits de la personne courante — les faits des AUTRES
   * personnes du dossier sont volontairement exclus (règle métier).
   */
  readonly faitsPropres = computed<FaitReprocheResponse[]>(() =>
    this.faits().filter(f => this.faitsPropresSet().has(f.id))
  );

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.dossierService.listerFaits(this.data.dossierId).subscribe({
      next: (liste: FaitReprocheResponse[]) => {
        // Trier par date décroissante (le plus récent en premier)
        const trie = [...liste].sort((a, b) => {
          const dA = a.dateFaits ? new Date(a.dateFaits).getTime() : 0;
          const dB = b.dateFaits ? new Date(b.dateFaits).getTime() : 0;
          return dB - dA;
        });
        this.faits.set(trie);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les faits du dossier.');
        this.chargement.set(false);
      }
    });
  }

  /**
   * Ouvre le dialog ReprocherFaitDialog par-dessus.
   * Si un fait est créé, on rafraîchit la liste ET on notifie le parent.
   */
  ajouterFait(): void {
    if (!this.data.implicationCourante) {
      return;
    }
    const ref = this.dialog.open(ReprocherFaitDialog, {
      data: {
        personneId: this.data.personneCouranteId,
        personneNomAffichage: this.data.personneCouranteNom,
        implicationsActuelles: [this.data.implicationCourante]
      },
      width: '900px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe((resultat) => {
      if (resultat?.cree) {
        // Rafraîchir la liste locale
        this.charger();
        // Signaler au parent qu'il faut recharger la fiche personne
        // (le parent le fera au close du dialog des faits)
        this.dialogRef.close({ modifie: true });
      }
    });
  }

  variantStatut(statut: string | undefined): 'valide' | 'attente' | 'rejete' | 'neutre' {
    if (statut === 'VALIDEE') return 'valide';
    if (statut === 'EN_ATTENTE') return 'attente';
    if (statut === 'REJETEE') return 'rejete';
    return 'neutre';
  }

  libelleStatut(statut: string | undefined): string {
    const map: Record<string, string> = {
      'VALIDEE': 'Validé',
      'EN_ATTENTE': 'En attente',
      'REJETEE': 'Rejeté'
    };
    return map[statut || ''] || statut || '—';
  }

  iconeStatut(statut: string | undefined): LucideIconData {
    if (statut === 'VALIDEE') return this.icons['CheckCircle2'];
    if (statut === 'EN_ATTENTE') return this.icons['Clock'];
    if (statut === 'REJETEE') return this.icons['XCircle'];
    return this.icons['Info'];
  }

  fermer(): void {
    this.dialogRef.close();
  }
}
