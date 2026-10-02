import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ChargementListe } from '../../../../shared/ui/chargement-liste/chargement-liste';
import { DialogMotif, DialogMotifData } from '../../../../shared/ui/dialog-motif/dialog-motif';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { VerificationService } from '../../verification.service';
import { DemandeExport } from '../../verification.models';

/** Traitement, par un administrateur, des demandes d'export de dossier complet deposees par les consultants. */
@Component({
  selector: 'app-demandes-export',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, ChargementListe, EmptyState, PageHeader],
  templateUrl: './demandes-export.html',
  styleUrl: '../mes-demandes/mes-demandes.scss'
})
export class DemandesExport {
  private readonly service = inject(VerificationService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);

  protected readonly demandes = signal<DemandeExport[]>([]);
  protected readonly chargement = signal(true);
  protected readonly filtre = signal<'EN_ATTENTE' | ''>('EN_ATTENTE');

  constructor() { this.charger(); }

  protected charger(): void {
    this.chargement.set(true);
    this.service.demandes(this.filtre() || undefined).subscribe({
      next: (l) => { this.demandes.set(l); this.chargement.set(false); },
      error: () => { this.toastr.error('Impossible de charger les demandes.'); this.chargement.set(false); }
    });
  }

  protected afficher(f: 'EN_ATTENTE' | ''): void { this.filtre.set(f); this.charger(); }

  protected libelle(s: string): string {
    return ({ EN_ATTENTE: 'En attente', ACCORDEE: 'Accordée', REFUSEE: 'Refusée' } as Record<string, string>)[s] ?? s;
  }

  protected accorder(d: DemandeExport): void {
    const data: DialogMotifData = {
      titre: 'Accorder la demande',
      message: `${d.demandeur} pourra recevoir le dossier complet de ${d.personne}. Précisez comment il sera transmis.`,
      label: 'Modalités de transmission',
      bouton: 'Accorder',
      minimum: 5,
      maximum: 1000
    };
    this.ouvrir(data, (texte) => this.decider(d, 'ACCORDEE', texte));
  }

  protected refuser(d: DemandeExport): void {
    const data: DialogMotifData = {
      titre: 'Refuser la demande',
      message: 'La raison du refus sera visible par le demandeur.',
      label: 'Raison du refus',
      bouton: 'Refuser',
      minimum: 5,
      maximum: 1000
    };
    this.ouvrir(data, (texte) => this.decider(d, 'REFUSEE', texte));
  }

  private ouvrir(data: DialogMotifData, suite: (texte: string) => void): void {
    this.dialog.open<DialogMotif, DialogMotifData, string>(DialogMotif, { data, width: '560px', maxWidth: '92vw' })
      .afterClosed().subscribe((texte) => { if (texte) suite(texte); });
  }

  private decider(d: DemandeExport, decision: 'ACCORDEE' | 'REFUSEE', commentaire: string): void {
    this.service.decider(d.id, decision, commentaire).subscribe({
      next: () => {
        this.toastr.success(decision === 'ACCORDEE' ? 'Demande accordée.' : 'Demande refusée.');
        this.charger();
      },
      error: (e: HttpErrorResponse) => this.toastr.error(e.error?.detail ?? 'La décision n\'a pas pu être enregistrée.')
    });
  }
}
