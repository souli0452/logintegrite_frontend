import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, catchError, map } from 'rxjs';
import {
  LucideAngularModule,
  Check, X, Eye, Shield, User, Building2, ChevronDown, ChevronRight,
  Search, Calendar, FolderOpen, CheckCheck, XCircle, FileWarning,
  LucideIconData
} from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { DossierService } from '../../../dossiers/services/dossier.service';
import {
  DossierAValiderResponse,
  FaitReprocheResponse,
  FaitRejeteResponse
} from '../../../dossiers/models/dossier.models';
import { ConfirmationService } from '../../../../shared/services/confirmation.service';
import { MotifRejetDialog } from '../motif-rejet-dialog/motif-rejet-dialog';

type TriOrdre = 'RECENT' | 'ANCIEN' | 'PLUS_DE_FAITS';
type OngletActif = 'EN_ATTENTE' | 'REJETES';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-validation-liste',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DecimalPipe,
    MatButtonModule, MatTooltipModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule,
    LucideAngularModule,
    PageHeader, EmptyState
  ],
  templateUrl: './validation-liste.html',
  styleUrl: './validation-liste.scss'
})
export class ValidationListe {
  private readonly service = inject(DossierService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toastr = inject(ToastrService);
  private readonly confirmation = inject(ConfirmationService);

  readonly icons: Record<string, LucideIconData> = {
    Check, X, Eye, Shield, User, Building2, ChevronDown, ChevronRight,
    Search, Calendar, FolderOpen, CheckCheck, XCircle, FileWarning
  };

  // Etat commun
  readonly ongletActif = signal<OngletActif>('EN_ATTENTE');
  readonly chargement = signal(true);

  // === Onglet En attente ===
  readonly dossiers = signal<DossierAValiderResponse[]>([]);
  readonly termeRecherche = signal('');
  readonly ordreTri = signal<TriOrdre>('RECENT');
  readonly dossierOuvertId = signal<string | null>(null);

  // === Onglet Rejetés ===
  readonly faitsRejetes = signal<FaitRejeteResponse[]>([]);
  readonly termeRechercheRejetes = signal('');

  // Compteurs
  readonly totalFaits = computed(() =>
    this.dossiers().reduce((acc, d) => acc + d.nombreFaitsEnAttente, 0)
  );
  readonly totalRejetes = computed(() => this.faitsRejetes().length);

  // Dossiers filtrés (En attente)
  readonly dossiersAffiches = computed<DossierAValiderResponse[]>(() => {
    const terme = this.termeRecherche().toLowerCase().trim();
    const tri = this.ordreTri();
    let liste = [...this.dossiers()];

    if (terme) {
      liste = liste.filter((d) => {
        const numero = (d.numeroDossier ?? '').toLowerCase();
        const intitule = (d.intitule ?? '').toLowerCase();
        const nom = (d.personneNomAffichage ?? '').toLowerCase();
        return numero.includes(terme) || intitule.includes(terme) || nom.includes(terme);
      });
    }

    liste.sort((a, b) => {
      if (tri === 'RECENT') return b.dateOuverture.localeCompare(a.dateOuverture);
      if (tri === 'ANCIEN') return a.dateOuverture.localeCompare(b.dateOuverture);
      return b.nombreFaitsEnAttente - a.nombreFaitsEnAttente;
    });

    return liste;
  });

  // Faits rejetés filtrés
  readonly rejetesAffiches = computed<FaitRejeteResponse[]>(() => {
    const terme = this.termeRechercheRejetes().toLowerCase().trim();
    if (!terme) return this.faitsRejetes();
    return this.faitsRejetes().filter(f =>
      (f.numeroDossier ?? '').toLowerCase().includes(terme) ||
      (f.intitule ?? '').toLowerCase().includes(terme) ||
      (f.personneNomAffichage ?? '').toLowerCase().includes(terme) ||
      f.description.toLowerCase().includes(terme) ||
      f.typeInfractionLibelle.toLowerCase().includes(terme) ||
      f.motifRejet.toLowerCase().includes(terme)
    );
  });

  constructor() {
    this.chargerTout();
  }

  chargerTout(): void {
    this.chargement.set(true);
    forkJoin({
      enAttente: this.service.listerDossiersAValider(),
      rejetes: this.service.listerFaitsRejetes()
    }).subscribe({
      next: (data) => {
        this.dossiers.set(data.enAttente);
        this.faitsRejetes.set(data.rejetes);
        if (data.enAttente.length > 0) {
          this.dossierOuvertId.set(data.enAttente[0].dossierId);
        }
        this.chargement.set(false);
      },
      error: () => {
        this.toastr.error('Impossible de charger les donnees de validation');
        this.chargement.set(false);
      }
    });
  }

  changerOnglet(index: number): void {
    this.ongletActif.set(index === 0 ? 'EN_ATTENTE' : 'REJETES');
  }

  // ============ ONGLET EN ATTENTE ============
  basculerDossier(dossierId: string): void {
    this.dossierOuvertId.set(this.dossierOuvertId() === dossierId ? null : dossierId);
  }

  estOuvert(dossierId: string): boolean {
    return this.dossierOuvertId() === dossierId;
  }

  changerRecherche(valeur: string): void { this.termeRecherche.set(valeur); }
  changerTri(valeur: TriOrdre): void { this.ordreTri.set(valeur); }
  voirDossier(dossierId: string): void { this.router.navigate(['/dossiers', dossierId]); }
  voirPersonne(personneId: string | null | undefined): void {
    if (personneId) this.router.navigate(['/personnes', personneId]);
  }

  validerFait(dossier: DossierAValiderResponse, fait: FaitReprocheResponse): void {
    this.confirmation.demander({
      titre: 'Valider ce fait',
      message: 'Confirmer la validation de ce fait reproche ?',
      detail: `${fait.typeInfractionLibelle} - ${fait.description}`,
      libelleConfirmer: 'Valider'
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.service.validerFait(fait.id).subscribe({
        next: () => {
          this.toastr.success('Fait valide');
          this.retirerFaitDeLaVue(dossier.dossierId, fait.id);
        },
        error: () => this.toastr.error('Validation impossible')
      });
    });
  }

  rejeterFait(dossier: DossierAValiderResponse, fait: FaitReprocheResponse): void {
    const ref = this.dialog.open(MotifRejetDialog, { width: '600px' });
    ref.afterClosed().subscribe((motif) => {
      if (!motif) return;
      this.service.rejeterFait(fait.id, motif).subscribe({
        next: () => {
          this.toastr.success('Fait rejete');
          this.retirerFaitDeLaVue(dossier.dossierId, fait.id);
          // Recharge la liste des rejetés pour prendre en compte le nouveau
          this.service.listerFaitsRejetes().subscribe(rejetes => this.faitsRejetes.set(rejetes));
        },
        error: () => this.toastr.error('Rejet impossible')
      });
    });
  }

  toutValider(dossier: DossierAValiderResponse): void {
    const nombre = dossier.faitsEnAttente.length;
    if (nombre === 0) return;

    this.confirmation.demander({
      titre: 'Valider tous les faits',
      message: `Valider les ${nombre} fait(s) en attente de ce dossier ?`,
      detail: `Dossier ${dossier.numeroDossier ?? ''} - ${dossier.intitule ?? ''}`,
      libelleConfirmer: 'Tout valider'
    }).subscribe((confirme) => {
      if (!confirme) return;
      this.executerValidationEnLot(dossier);
    });
  }

  private executerValidationEnLot(dossier: DossierAValiderResponse): void {
    const flux = dossier.faitsEnAttente.map((f) =>
      this.service.validerFait(f.id).pipe(
        map(() => ({ id: f.id, ok: true as const })),
        catchError(() => of({ id: f.id, ok: false as const }))
      )
    );

    forkJoin(flux).subscribe((resultats) => {
      const ok = resultats.filter((r) => r.ok).length;
      const ko = resultats.length - ok;

      if (ok > 0) {
        const idsOk = new Set(resultats.filter((r) => r.ok).map((r) => r.id));
        this.dossiers.update((liste) =>
          liste.map((d) => {
            if (d.dossierId !== dossier.dossierId) return d;
            const restants = d.faitsEnAttente.filter((f) => !idsOk.has(f.id));
            return {
              ...d,
              faitsEnAttente: restants,
              nombreFaitsEnAttente: restants.length
            };
          }).filter((d) => d.faitsEnAttente.length > 0)
        );
        this.toastr.success(`${ok} fait(s) valide(s)`);
      }
      if (ko > 0) {
        this.toastr.warning(`${ko} fait(s) en echec - reessayez`);
      }
    });
  }

  private retirerFaitDeLaVue(dossierId: string, faitId: string): void {
    this.dossiers.update((liste) =>
      liste.map((d) => {
        if (d.dossierId !== dossierId) return d;
        const restants = d.faitsEnAttente.filter((f) => f.id !== faitId);
        return {
          ...d,
          faitsEnAttente: restants,
          nombreFaitsEnAttente: restants.length
        };
      }).filter((d) => d.faitsEnAttente.length > 0)
    );
  }

  // ============ ONGLET REJETES ============
  changerRechercheRejetes(valeur: string): void {
    this.termeRechercheRejetes.set(valeur);
  }

  voirDossierRejete(dossierId: string): void {
    this.router.navigate(['/dossiers', dossierId]);
  }

  voirPersonneRejete(personneId: string | undefined): void {
    if (personneId) this.router.navigate(['/personnes', personneId]);
  }
}
