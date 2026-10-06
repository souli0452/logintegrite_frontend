import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, FileText, FileSpreadsheet, Download, RefreshCw, LucideIconData } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { EtatTrimestrielResume, TrimestreOption } from '../models/etat-trimestriel.models';
import { EtatTrimestrielService, libelleTrimestre, trimestresTermines } from '../services/etat-trimestriel.service';
import { RapportService } from '../services/rapport.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-etats-trimestriels-page',
  standalone: true,
  imports: [DatePipe, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, LucideAngularModule, PageHeader],
  templateUrl: './etats-trimestriels-page.html',
  styleUrl: './etats-trimestriels-page.scss'
})
export class EtatsTrimestrielsPage {
  private readonly service = inject(EtatTrimestrielService);
  private readonly rapports = inject(RapportService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  readonly icons: Record<string, LucideIconData> = { FileText, FileSpreadsheet, Download, RefreshCw };

  readonly etats = signal<EtatTrimestrielResume[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly enGeneration = signal(false);

  readonly peutGenerer = computed(() => this.auth.hasRole('ADMIN'));
  readonly trimestres: TrimestreOption[] = trimestresTermines(new Date(), 8);
  readonly trimestreChoisi = signal<TrimestreOption | null>(this.trimestres[0] ?? null);

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.lister().subscribe({
      next: liste => { this.etats.set(liste); this.chargement.set(false); },
      error: () => {
        this.erreur.set('Impossible de charger les états trimestriels.');
        this.chargement.set(false);
      }
    });
  }

  libelle(e: EtatTrimestrielResume): string {
    return libelleTrimestre(e.annee, e.trimestre);
  }

  telechargerPdf(e: EtatTrimestrielResume): void {
    this.service.pdf(e.id).subscribe({
      next: blob => this.rapports.telecharger(blob, `etat-trimestriel-T${e.trimestre}-${e.annee}.pdf`),
      error: () => this.toastr.error('Impossible de télécharger le PDF')
    });
  }

  telechargerExcel(e: EtatTrimestrielResume): void {
    this.service.excel(e.id).subscribe({
      next: blob => this.rapports.telecharger(blob, `etat-trimestriel-T${e.trimestre}-${e.annee}.xlsx`),
      error: () => this.toastr.error('Impossible de télécharger l\'Excel')
    });
  }

  generer(): void {
    const t = this.trimestreChoisi();
    if (!t || this.enGeneration()) return;
    const data: ConfirmDialogData = {
      titre: `Générer l'état ${t.libelle}`,
      message: `Générer maintenant l'état trimestriel ${t.libelle} ?`,
      detail: 'Si un état existe déjà pour ce trimestre, il sera conservé et marqué « remplacé » (3 régénérations au maximum).',
      libelleConfirmer: 'Générer'
    };
    this.dialog.open(ConfirmDialog, { data }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.enGeneration.set(true);
      this.service.generer(t.annee, t.trimestre).subscribe({
        next: () => {
          this.toastr.success(`État ${t.libelle} généré`);
          this.enGeneration.set(false);
          this.charger();
        },
        error: err => {
          this.toastr.error(err?.error?.message ?? 'Impossible de générer l\'état');
          this.enGeneration.set(false);
        }
      });
    });
  }
}
