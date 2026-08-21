import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, catchError, map } from 'rxjs';
import {
  LucideAngularModule,
  Upload, X, FileText, AlertTriangle, Trash2, Check,
  LucideIconData
} from 'lucide-angular';

import { DocumentService, UploadProgress } from '../services/document.service';
import { TypeDocumentService } from '../../referentiels/services/type-document.service';
import { TypeDocumentResponse } from '../../referentiels/models/referentiel.models';

// Contexte injecte a l'ouverture : quel dossier va recevoir les documents
export interface UploadDocumentContexte {
  dossierId: string;
  dossierIntitule: string;
  personneNom?: string;   // affiche si ouvert depuis une fiche personne
}

// Etat local d'un fichier a uploader
interface FichierPret {
  id: string;                    // uuid local pour tracking dans le template
  fichier: File;
  typeDocumentId: string | null; // choisi par l'utilisateur
  progression: number;           // 0-100
  statut: 'attente' | 'envoi' | 'succes' | 'erreur';
  messageErreur?: string;
}

// Limite fixee (20 MB en octets)
const TAILLE_MAX_OCTETS = 20 * 1024 * 1024;

@Component({
  selector: 'app-upload-document-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressBarModule,
    LucideAngularModule
  ],
  templateUrl: './upload-document-dialog.html',
  styleUrl: './upload-document-dialog.scss'
})
export class UploadDocumentDialog {
  private readonly dialogRef = inject(MatDialogRef<UploadDocumentDialog>);
  private readonly documentService = inject(DocumentService);
  private readonly typeDocumentService = inject(TypeDocumentService);
  private readonly toastr = inject(ToastrService);
  readonly contexte: UploadDocumentContexte = inject(MAT_DIALOG_DATA);

  readonly icons: Record<string, LucideIconData> = {
    Upload, X, FileText, AlertTriangle, Trash2, Check
  };

  readonly TAILLE_MAX_MB = 20;

  // Etat
  readonly typesDocument = signal<TypeDocumentResponse[]>([]);
  readonly fichiers = signal<FichierPret[]>([]);
  readonly enCoursDenvoi = signal(false);
  readonly survole = signal(false);   // pour le style drop-zone hover

  // Un fichier est pret quand il a un type selectionne
  readonly tousPrets = computed(() =>
    this.fichiers().length > 0 && this.fichiers().every((f) => f.typeDocumentId !== null)
  );

  // Y a-t-il au moins un succes (pour ne pas fermer sans avoir fait quelque chose)
  readonly aAuMoinsUnSucces = computed(() =>
    this.fichiers().some((f) => f.statut === 'succes')
  );

  constructor() {
    this.chargerTypesDocument();
  }

  private chargerTypesDocument(): void {
    this.typeDocumentService.lister().subscribe({
      next: (types: TypeDocumentResponse[]) => this.typesDocument.set(types),
      error: () => this.toastr.error('Impossible de charger les types de document')
    });
  }

  // Handler input file
  onFichiersChoisis(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.ajouterFichiers(Array.from(input.files));
    input.value = '';   // reset pour pouvoir reprendre le meme fichier si retire
  }

  // Handler drag & drop
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.survole.set(false);
    if (!event.dataTransfer?.files) return;
    this.ajouterFichiers(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.survole.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.survole.set(false);
  }

  private ajouterFichiers(nouveaux: File[]): void {
    const acceptes: FichierPret[] = [];
    for (const f of nouveaux) {
      if (f.size > TAILLE_MAX_OCTETS) {
        this.toastr.warning(`"${f.name}" depasse ${this.TAILLE_MAX_MB} Mo et sera ignore`);
        continue;
      }
      // Evite de rajouter deux fois le meme fichier (nom + taille)
      const dejaPresent = this.fichiers().some(
        (existant) => existant.fichier.name === f.name && existant.fichier.size === f.size
      );
      if (dejaPresent) {
        this.toastr.info(`"${f.name}" est deja dans la liste`);
        continue;
      }
      acceptes.push({
        id: crypto.randomUUID(),
        fichier: f,
        typeDocumentId: null,
        progression: 0,
        statut: 'attente'
      });
    }
    this.fichiers.update((liste) => [...liste, ...acceptes]);
  }

  changerType(id: string, typeId: string): void {
    this.fichiers.update((liste) =>
      liste.map((f) => f.id === id ? { ...f, typeDocumentId: typeId } : f)
    );
  }

  retirerFichier(id: string): void {
    this.fichiers.update((liste) => liste.filter((f) => f.id !== id));
  }

  // Upload de tous les fichiers en parallele
  uploaderTout(): void {
    if (!this.tousPrets()) {
      this.toastr.warning('Selectionnez un type pour chaque document');
      return;
    }
    this.enCoursDenvoi.set(true);

    // Ne re-uploade pas ceux deja en succes (permet de reessayer les echoues)
    const aTraiter = this.fichiers().filter((f) => f.statut !== 'succes');

    // On lance en parallele, chaque flux gere sa propre progression et son etat
    const flux = aTraiter.map((f) => {
      this.majFichier(f.id, { statut: 'envoi', progression: 0, messageErreur: undefined });
      return this.documentService
        .deposerAvecProgression(this.contexte.dossierId, f.fichier, f.typeDocumentId!)
        .pipe(
          map((event: UploadProgress) => {
            if (event.type === 'progress') {
              this.majFichier(f.id, { progression: event.pourcentage ?? 0 });
            } else {
              this.majFichier(f.id, { statut: 'succes', progression: 100 });
            }
            return { id: f.id, ok: true };
          }),
          catchError((err: { error?: { message?: string } }) => {
            const msg = err?.error?.message ?? 'Echec de l\'envoi';
            this.majFichier(f.id, { statut: 'erreur', messageErreur: msg });
            return of({ id: f.id, ok: false });
          })
        );
    });

    forkJoin(flux).subscribe((resultats) => {
      this.enCoursDenvoi.set(false);
      const ok = resultats.filter((r) => r.ok).length;
      const ko = resultats.length - ok;

      if (ok > 0) this.toastr.success(`${ok} document(s) enregistre(s) avec succes`);
      if (ko > 0) this.toastr.warning(`${ko} document(s) en echec - vous pouvez reessayer`);

      // Fermeture automatique si tout est en succes
      // On laisse 1.5s pour que l'utilisateur voie les badges "Scelle"
      if (ko === 0 && ok > 0) {
        setTimeout(() => this.fermer(), 1500);
      }
    });
  }

  private majFichier(id: string, patch: Partial<FichierPret>): void {
    this.fichiers.update((liste) =>
      liste.map((f) => f.id === id ? { ...f, ...patch } : f)
    );
  }

  fermer(): void {
    // On renvoie true si au moins un doc a ete uploade avec succes
    // pour que l'appelant puisse rafraichir sa liste
    this.dialogRef.close(this.aAuMoinsUnSucces());
  }

  // Formatte la taille pour affichage
  tailleFormattee(octets: number): string {
    if (octets < 1024) return octets + ' o';
    if (octets < 1024 * 1024) return (octets / 1024).toFixed(1) + ' Ko';
    return (octets / (1024 * 1024)).toFixed(2) + ' Mo';
  }
}
