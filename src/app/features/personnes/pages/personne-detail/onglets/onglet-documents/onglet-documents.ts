import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule,
  Plus, Download, FileText, ShieldCheck, FolderOpen, X,
  LucideIconData
} from 'lucide-angular';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { PersonneService } from '../../../../services/personne.service';
import { PersonneDetailService, PersonneDetailComplet } from '../../../../services/personne-detail.service';
import { PersonneDocumentResponse } from '../../../../models/personne.models';
import { UploadDocumentDialog, UploadDocumentContexte } from '../../../../../documents/upload-document-dialog/upload-document-dialog';
import { DossierResponse } from '../../../../models/personne.models';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-onglet-documents',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTooltipModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatSelectModule, MatButtonModule,
    LucideAngularModule,
    EmptyState
  ],
  templateUrl: './onglet-documents.html',
  styleUrl: './onglet-documents.scss'
})
export class OngletDocuments implements OnInit {
  private readonly personneService = inject(PersonneService);
  private readonly personneDetailService = inject(PersonneDetailService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly http = inject(HttpClient);

  // Contexte injecte depuis le parent (personne-detail)
  @Input({ required: true }) personneId!: string;
  @Input({ required: true }) personneNom!: string;

  readonly icons: Record<string, LucideIconData> = {
    Plus, Download, FileText, ShieldCheck, FolderOpen, X
  };

  readonly documents = signal<PersonneDocumentResponse[]>([]);
  readonly dossiersDeLaPersonne = signal<DossierResponse[]>([]);
  readonly chargement = signal(true);

  // Etat du mini-dialogue de selection du dossier destinataire
  readonly modeSelectionDossier = signal(false);
  readonly dossierChoisiId = signal<string | null>(null);

  // Dossier selectionne (objet complet pour transmission au dialogue upload)
  readonly dossierChoisi = computed<DossierResponse | null>(() => {
    const id = this.dossierChoisiId();
    if (!id) return null;
    return this.dossiersDeLaPersonne().find((d) => d.id === id) ?? null;
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    // Chargement parallele : documents de la personne + tous ses dossiers
    // (les dossiers servent pour la selection au moment d'ajouter un document)
    this.personneService.listerDocuments(this.personneId).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.chargerDossiers();
      },
      error: () => {
        this.toastr.error('Impossible de charger les documents');
        this.chargement.set(false);
      }
    });
  }

  private chargerDossiers(): void {
    // On recupere les dossiers de la personne via PersonneDetailService.
    // Ce service charge deja les donnees completes (dossiers + implications + faits...).
    this.personneDetailService.chargerToutesLesDonnees(this.personneId).subscribe({
      next: (data: PersonneDetailComplet) => {
        this.dossiersDeLaPersonne.set(data.dossiers);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });
  }

  // Etape 1 : afficher le mini-dialogue de selection du dossier
  ouvrirSelectionDossier(): void {
    if (this.dossiersDeLaPersonne().length === 0) {
      this.toastr.warning('Cette personne n\'est impliquee dans aucun dossier. Ajoutez d\'abord un dossier.');
      return;
    }
    // Si un seul dossier, on saute la selection et on ouvre directement le dialogue
    if (this.dossiersDeLaPersonne().length === 1) {
      this.dossierChoisiId.set(this.dossiersDeLaPersonne()[0].id);
      this.ouvrirDialogueUpload();
      return;
    }
    // Sinon on affiche la selection
    this.modeSelectionDossier.set(true);
    this.dossierChoisiId.set(null);
  }

  annulerSelection(): void {
    this.modeSelectionDossier.set(false);
    this.dossierChoisiId.set(null);
  }

  // Etape 2 : ouvrir le vrai dialogue d'upload avec le dossier choisi
  ouvrirDialogueUpload(): void {
    const dossier = this.dossierChoisi();
    if (!dossier) {
      this.toastr.warning('Choisissez un dossier');
      return;
    }

    const contexte: UploadDocumentContexte = {
      dossierId: dossier.id,
      dossierIntitule: dossier.intitule ?? dossier.numeroDossier ?? 'Dossier',
      personneNom: this.personneNom
    };

    // On sort du mode selection
    this.modeSelectionDossier.set(false);

    const ref = this.dialog.open(UploadDocumentDialog, {
      data: contexte,
      width: '640px',
      maxHeight: '90vh',
      disableClose: true
    });

    ref.afterClosed().subscribe((rafraichir: boolean) => {
      if (rafraichir) {
        this.charger();
      }
    });
  }

  telecharger(doc: PersonneDocumentResponse): void {
    const url = `${environment.apiUrl}/dossiers/${doc.dossierId}/documents/${doc.id}/telecharger`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = doc.nomOriginal;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => this.toastr.error('Echec du telechargement')
    });
  }

  tailleFormattee(octets: number): string {
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return (octets / 1024).toFixed(1) + ' Ko';
    return (octets / (1024 * 1024)).toFixed(2) + ' Mo';
  }

  hashCourt(hash: string): string {
    if (!hash || hash.length < 20) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  }
}
