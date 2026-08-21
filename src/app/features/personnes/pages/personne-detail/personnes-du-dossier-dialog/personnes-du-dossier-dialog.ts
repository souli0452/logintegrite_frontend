import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LucideAngularModule, Users, X, User, Building2, ExternalLink, Scale, Star, Plus,
  LucideIconData
} from 'lucide-angular';

import { ImplicationService } from '../../../services/implication.service';
import { ImplicationResponse } from '../../../../dossiers/models/dossier.models';
import { AjouterPersonneDossierDialog } from '../../../../dossiers/pages/dossier-detail/ajouter-personne-dossier-dialog/ajouter-personne-dossier-dialog';

export interface DonneesDialogPersonnesDossier {
  dossierId: string;
  dossierIntitule: string;
  numeroDossier?: string;
  personneCouranteId: string;
}

@Component({
  selector: 'app-personnes-du-dossier-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressSpinnerModule, LucideAngularModule],
  templateUrl: './personnes-du-dossier-dialog.html',
  styleUrl: './personnes-du-dossier-dialog.scss'
})
export class PersonnesDuDossierDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<PersonnesDuDossierDialog>);
  readonly data = inject<DonneesDialogPersonnesDossier>(MAT_DIALOG_DATA);
  private readonly implicationService = inject(ImplicationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly icons: Record<string, LucideIconData> = {
    Users, X, User, Building2, ExternalLink, Scale, Star, Plus
  };

  readonly implications = signal<ImplicationResponse[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  /** Nombre de personnes distinctes impliquées (déduit du set des personneId). */
  readonly nombrePersonnes = computed(() =>
    new Set(this.implications().map(i => i.personneId)).size
  );

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.implicationService.listerParDossier(this.data.dossierId).subscribe({
      next: (liste: ImplicationResponse[]) => {
        // Trier : la personne actuellement consultée en premier, puis ordre alphabétique
        const trie = [...liste].sort((a, b) => {
          if (a.personneId === this.data.personneCouranteId) return -1;
          if (b.personneId === this.data.personneCouranteId) return 1;
          return (a.personneNomAffichage || '').localeCompare(b.personneNomAffichage || '');
        });
        this.implications.set(trie);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les personnes du dossier.');
        this.chargement.set(false);
      }
    });
  }

  /**
   * Ouvre le dialog "Ajouter une personne au dossier" par-dessus.
   * Au retour, si une personne a été ajoutée, on rafraîchit la liste.
   */
  ajouterPersonne(): void {
    const personnesDejaImpliqueesIds = this.implications().map(i => i.personneId);

    const ref = this.dialog.open(AjouterPersonneDossierDialog, {
      data: {
        dossierId: this.data.dossierId,
        numeroDossier: this.data.numeroDossier,
        dossierIntitule: this.data.dossierIntitule,
        personnesDejaImpliqueesIds
      },
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      autoFocus: false
    });

    ref.afterClosed().subscribe((ajoutee: boolean | undefined) => {
      if (ajoutee) {
        // Rafraîchir la liste
        this.charger();
        // Signaler au parent qu'il faut recharger la fiche personne
        this.dialogRef.close({ modifie: true });
      }
    });
  }

  /**
   * Navigation vers la fiche d'une autre personne impliquée.
   * Aucune action si l'utilisateur clique sur la ligne de la personne déjà consultée.
   */
  ouvrirFiche(personneId: string): void {
    if (personneId === this.data.personneCouranteId) return;
    this.router.navigate(['/personnes', personneId]);
    this.dialogRef.close();
  }

  fermer(): void {
    this.dialogRef.close();
  }

  /**
   * Variant visuel selon le libellé du statut judiciaire.
   */
  variantStatut(libelle: string | null | undefined): 'critique' | 'attention' | 'positif' | 'neutre' {
    if (!libelle) return 'neutre';
    const l = libelle.toLowerCase();
    if (/(condamn|poursuiv|mis en examen|inculp|renvoy)/.test(l)) return 'critique';
    if (/(relax|acquitt|non[-\s]?lieu|innoc)/.test(l)) return 'positif';
    if (/(enqu[êe]t|instruction|attente|suspect|convoq)/.test(l)) return 'attention';
    return 'neutre';
  }
}
