import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, ArrowLeft, Download, Info } from 'lucide-angular';

import { ChargementListe } from '../../../../shared/ui/chargement-liste/chargement-liste';
import { DialogMotif, DialogMotifData } from '../../../../shared/ui/dialog-motif/dialog-motif';
import { VerificationService } from '../../verification.service';
import { FaitVerification, FicheVerification, PeineVerification } from '../../verification.models';

type Ton = 'favorable' | 'defavorable' | 'en-cours';

/** Fiche de verification : dossiers entierement valides, faits, statuts judiciaires (dont relaxes) et peines. Aucun document. */
@Component({
  selector: 'app-verification-fiche',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, LucideAngularModule, ChargementListe],
  templateUrl: './verification-fiche.html',
  styleUrl: './verification-fiche.scss'
})
export class VerificationFiche {
  private readonly service = inject(VerificationService);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  /** Parametre de route `:id` (lie par withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly icons = { ArrowLeft, Download, Info };
  protected readonly fiche = signal<FicheVerification | null>(null);
  protected readonly chargement = signal(true);
  protected readonly introuvable = signal(false);

  constructor() {
    queueMicrotask(() => this.charger());
  }

  private charger(): void {
    this.service.fiche(this.id()).subscribe({
      next: (f) => { this.fiche.set(f); this.chargement.set(false); },
      error: (e: HttpErrorResponse) => {
        this.introuvable.set(e.status === 404);
        this.chargement.set(false);
        if (e.status !== 404) this.toastr.error('La fiche est momentanément indisponible.');
      }
    });
  }

  protected retour(): void { this.router.navigate(['/verification']); }

  /** Vert : relaxe, acquittement, non-lieu, classement. Rouge : condamnation. Orange : procedure en cours. */
  private static readonly TYPES_PEINE: Record<string, string> = {
    PRISON: 'Peine de prison', AMENDE: 'Amende', CONFISCATION: 'Confiscation', RADIATION: 'Radiation', AUTRE: 'Autre sanction'
  };

  /** Libelle lisible d'une peine ; la nature n'est ajoutee que si elle apporte une precision. */
  protected libellePeine(p: PeineVerification): string {
    const type = p.typePeine ? (VerificationFiche.TYPES_PEINE[p.typePeine] ?? p.typePeine) : 'Sanction';
    const nature = p.natureSanction?.trim();
    return nature && nature.toLowerCase() !== type.toLowerCase() ? type + ' · ' + nature : type;
  }

  protected ton(f: FaitVerification): Ton {
    if (f.issueFavorable) return 'favorable';
    return /condamn/i.test(f.statutJudiciaire) ? 'defavorable' : 'en-cours';
  }

  protected demanderExport(): void {
    const fiche = this.fiche();
    if (!fiche) return;
    const data: DialogMotifData = {
      titre: "Demander l'export du dossier complet",
      message: "L'export est accordé ou refusé par un administrateur, sur la base de votre motif. Chaque demande est conservée.",
      label: 'Motif de la demande',
      bouton: 'Envoyer la demande',
      minimum: 20,
      maximum: 1000
    };
    this.dialog.open<DialogMotif, DialogMotifData, string>(DialogMotif, { data, width: '560px', maxWidth: '92vw' })
      .afterClosed().subscribe((motif) => {
        if (!motif) return;
        this.service.demanderExport(fiche.id, motif).subscribe({
          next: () => {
            this.toastr.success('Demande envoyée. Suivez-la dans « Mes demandes de dossier ».');
            this.router.navigate(['/verification/mes-demandes']);
          },
          error: (e: HttpErrorResponse) => this.toastr.error(e.error?.detail ?? "La demande n'a pas pu être envoyée.")
        });
      });
  }
}
