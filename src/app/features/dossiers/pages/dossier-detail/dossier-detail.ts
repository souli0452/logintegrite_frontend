import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule, Users, FileText, Paperclip,
  LucideIconData
} from 'lucide-angular';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { ModifierDossierDialog } from './modifier-dossier-dialog/modifier-dossier-dialog';
import { DossierService } from '../../services/dossier.service';
import { RapportService } from '../../../rapports/services/rapport.service';
import {
  DossierResponse, ImplicationResponse, FaitReprocheResponse
} from '../../models/dossier.models';

import { HeroDossier } from './composants/hero-dossier/hero-dossier';
import { KpiBarDossier } from './composants/kpi-bar-dossier/kpi-bar-dossier';
import { OngletDossierImplications } from './onglets/onglet-dossier-implications/onglet-dossier-implications';
import { OngletDossierFaits } from './onglets/onglet-dossier-faits/onglet-dossier-faits';
import { OngletDossierDocuments } from './onglets/onglet-dossier-documents/onglet-dossier-documents';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dossier-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatProgressSpinnerModule,
    LucideAngularModule,
    HeroDossier, KpiBarDossier,
    OngletDossierImplications, OngletDossierFaits, OngletDossierDocuments
  ],
  templateUrl: './dossier-detail.html',
  styleUrl: './dossier-detail.scss'
})
export class DossierDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(DossierService);
  private readonly rapportService = inject(RapportService);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);

  readonly dossier = signal<DossierResponse | null>(null);
  readonly implications = signal<ImplicationResponse[]>([]);
  readonly faits = signal<FaitReprocheResponse[]>([]);
  readonly nbDocuments = signal(0);

  readonly chargement = signal(true);
  readonly telechargementEnCours = signal(false);
  readonly ongletActif = signal(0);

  readonly icons: Record<string, LucideIconData> = {
    Users, FileText, Paperclip
  };

  readonly dossierOuvert = computed(() => this.dossier()?.statutDossier === 'OUVERT');
  protected readonly auth = inject(AuthService);
  readonly peutReprendre = computed(() => this.dossierOuvert() && this.auth.hasAnyRole('AGENT', 'ADMIN'));

  reprendreFait(fait: FaitReprocheResponse): void {
    this.service.reprendreFait(fait.id).subscribe({
      next: (maj) => {
        this.faits.update((liste) => liste.map((f) => (f.id === maj.id ? maj : f)));
        this.toastr.success('Le fait est de nouveau en attente de validation');
      },
      error: (e) => this.toastr.error(e?.error?.detail ?? 'Impossible de représenter ce fait')
    });
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/dossiers']);
      return;
    }
    this.charger(id);
  }

  private charger(id: string): void {
    this.chargement.set(true);
    forkJoin({
      dossier: this.service.obtenir(id),
      implications: this.service.listerImplications(id),
      faits: this.service.listerFaits(id)
    }).subscribe({
      next: (data) => {
        this.dossier.set(data.dossier);
        this.implications.set(data.implications);
        this.faits.set(data.faits);
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger le dossier');
        this.chargement.set(false);
      }
    });
  }

  retourListe(): void {
    this.router.navigate(['/dossiers']);
  }

  // ─── Actions du hero ───────────────────────────────────────────────────────
  telechargerPdf(): void {
    const d = this.dossier();
    if (!d) return;
    this.telechargementEnCours.set(true);
    this.rapportService.pdfDossier(d.id).subscribe({
      next: (blob) => {
        const nom = d.numeroDossier
          ? `dossier-${d.numeroDossier}.pdf`
          : `dossier-${d.id.substring(0, 8)}.pdf`;
        this.rapportService.telecharger(blob, nom);
        this.toastr.success('PDF téléchargé');
        this.telechargementEnCours.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de générer le PDF');
        this.telechargementEnCours.set(false);
      }
    });
  }

  cloturer(): void {
    const d = this.dossier();
    if (!d) return;
    this.confirmation.demander({
      titre: 'Clôturer le dossier',
      message: `Clôturer le dossier "${d.numeroDossier ?? d.id}" ? Cette action rendra le dossier non modifiable.`,
      libelleConfirmer: 'Clôturer'
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.cloturer(d.id).subscribe({
        next: (updated) => {
          this.dossier.set(updated);
          this.toastr.success('Dossier clôturé');
        },
        error: (e) => this.toastr.error(e?.error?.detail ?? 'Clôture impossible')
      });
    });
  }

  modifierDossier(): void {
    const d = this.dossier();
    if (!d) return;
    this.dialog.open<ModifierDossierDialog, DossierResponse, DossierResponse>(ModifierDossierDialog, {
      data: d, width: '600px', maxWidth: '92vw'
    }).afterClosed().subscribe((maj) => { if (maj) this.dossier.set(maj); });
  }

  // ─── Événements des onglets ────────────────────────────────────────────────
  surImplicationSupprimee(implicationId: string): void {
    this.implications.update((liste) => liste.filter((i) => i.id !== implicationId));
  }

  rechargerImplications(): void {
    const d = this.dossier();
    if (!d) return;
    this.service.listerImplications(d.id).subscribe({
      next: (liste) => this.implications.set(liste),
      error: () => this.toastr.error('Impossible de recharger les implications')
    });
  }

  onNbDocumentsChange(nb: number): void {
    this.nbDocuments.set(nb);
  }

  onNaviguerVersOnglet(index: number): void {
    this.ongletActif.set(index);
  }

  onOngletChange(index: number): void {
    this.ongletActif.set(index);
  }
}
