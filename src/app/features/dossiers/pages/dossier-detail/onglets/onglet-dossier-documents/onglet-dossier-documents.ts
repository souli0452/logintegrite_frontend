import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule,
  Plus, Download, FileText, Shield, ShieldCheck,
  LucideIconData
} from 'lucide-angular';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { DocumentService } from '../../../../../documents/services/document.service';
import { UploadDocumentDialog, UploadDocumentContexte } from '../../../../../documents/upload-document-dialog/upload-document-dialog';
import { DocumentResponse } from '../../../../../personnes/models/personne.models';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-onglet-dossier-documents',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTooltipModule, MatProgressSpinnerModule,
    LucideAngularModule,
    EmptyState
  ],
  templateUrl: './onglet-dossier-documents.html',
  styleUrl: './onglet-dossier-documents.scss'
})
export class OngletDossierDocuments implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly http = inject(HttpClient);

  // Inputs sous forme de Signals (Angular 17.1+)
  // Sécurisés si le parent utilise @if (dossier()) { ... }
  readonly dossierId = input.required<string>();
  readonly dossierIntitule = input.required<string>();

  readonly icons: Record<string, LucideIconData> = {
    Plus, Download, FileText, Shield, ShieldCheck
  };

  readonly documents = signal<DocumentResponse[]>([]);
  readonly chargement = signal(true);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.http.get<DocumentResponse[]>(
      `${environment.apiUrl}/dossiers/${this.dossierId()}/documents`
    ).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les documents');
        this.chargement.set(false);
      }
    });
  }

  ouvrirDialogueUpload(): void {
    const contexte: UploadDocumentContexte = {
      dossierId: this.dossierId(),
      dossierIntitule: this.dossierIntitule()
    };

    const ref = this.dialog.open(UploadDocumentDialog, {
      data: contexte,
      width: '640px',
      maxHeight: '90vh',
      disableClose: true
    });

    ref.afterClosed().subscribe((rafraichir: boolean) => {
      // Si au moins un document a été uploadé avec succès, on recharche la liste
      if (rafraichir) {
        this.charger();
      }
    });
  }

  telecharger(doc: DocumentResponse): void {
    const url = `${environment.apiUrl}/dossiers/${this.dossierId()}/documents/${doc.id}/telecharger`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = doc.nomOriginal;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => this.toastr.error('Échec du téléchargement')
    });
  }

  // Formate la taille pour affichage
  tailleFormattee(octets: number): string {
    if (!octets) return '0 o';
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return (octets / 1024).toFixed(1) + ' Ko';
    return (octets / (1024 * 1024)).toFixed(2) + ' Mo';
  }

  // Extrait les 8 premiers et 8 derniers caractères du hash pour affichage compact
  hashCourt(hash: string): string {
    if (!hash || hash.length < 20) return hash || '—';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  }
}
