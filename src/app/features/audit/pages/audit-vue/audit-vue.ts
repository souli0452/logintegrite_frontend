import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  Search,
  ClipboardList,
  Eye,
  LucideIconData
} from 'lucide-angular';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { OngletAuditModifications } from './onglets/onglet-audit-modifications/onglet-audit-modifications';
import { OngletAuditConsultations } from './onglets/onglet-audit-consultations/onglet-audit-consultations';

import { BandeauIntegrite } from './composants/bandeau-integrite/bandeau-integrite';
import { KpiForensique } from './composants/kpi-forensique/kpi-forensique';
import { VerificationHashDrawer } from './composants/verification-hash-drawer/verification-hash-drawer';

import { AuditForensiqueService } from '../../services/audit-forensique.service';
import {
  EtatChaineResponse,
  KpiForensiqueResponse,
  VerificationChaineResponse
} from '../../models/audit.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-vue',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    LucideAngularModule,
    PageHeader,
    OngletAuditModifications,
    OngletAuditConsultations,
    BandeauIntegrite,
    KpiForensique,
    VerificationHashDrawer
  ],
  templateUrl: './audit-vue.html',
  styleUrl: './audit-vue.scss'
})
export class AuditVue implements OnInit {
  private readonly forensique = inject(AuditForensiqueService);
  private readonly snack = inject(MatSnackBar);

  // ─── État chaîne ────────────────────────────────────────────────────────────
  readonly etat = signal<EtatChaineResponse | null>(null);
  readonly chargementEtat = signal(false);

  // ─── Vérification ──────────────────────────────────────────────────────────
  readonly verification = signal<VerificationChaineResponse | null>(null);
  readonly verificationEnCours = signal(false);

  // ─── KPI ────────────────────────────────────────────────────────────────────
  readonly kpi = signal<KpiForensiqueResponse | null>(null);
  readonly chargementKpi = signal(false);

  // ─── Drawer ────────────────────────────────────────────────────────────────
  readonly drawerOuvert = signal(false);

  readonly icons: Record<string, LucideIconData> = { Search, ClipboardList, Eye };

  ngOnInit(): void {
    this.chargerEtat();
    this.chargerKpi();
  }

  chargerEtat(): void {
    this.chargementEtat.set(true);
    this.forensique.etatChaine().subscribe({
      next: (r) => {
        this.etat.set(r);
        this.chargementEtat.set(false);
      },
      error: () => {
        this.chargementEtat.set(false);
        this.snack.open('Impossible de charger l\'état de la chaîne', 'Fermer', { duration: 3500 });
      }
    });
  }

  chargerKpi(): void {
    this.chargementKpi.set(true);
    this.forensique.kpiForensique().subscribe({
      next: (r) => {
        this.kpi.set(r);
        this.chargementKpi.set(false);
      },
      error: () => {
        this.chargementKpi.set(false);
        this.snack.open('Impossible de charger les indicateurs', 'Fermer', { duration: 3500 });
      }
    });
  }

  declencherVerification(): void {
    this.verificationEnCours.set(true);
    this.forensique.verifierChaine().subscribe({
      next: (r) => {
        this.verification.set(r);
        this.verificationEnCours.set(false);
        const msg = r.chaineIntegre
          ? `✅ Chaîne intègre — ${r.maillonsVerifies} maillons vérifiés en ${r.dureeMillisecondes} ms`
          : `⚠️ ${r.nombreRuptures} rupture(s) détectée(s)`;
        this.snack.open(msg, 'Fermer', { duration: 5000 });
      },
      error: () => {
        this.verificationEnCours.set(false);
        this.snack.open('Erreur lors de la vérification cryptographique', 'Fermer', { duration: 3500 });
      }
    });
  }

  rafraichirTout(): void {
    this.chargerEtat();
    this.chargerKpi();
  }

  ouvrirDrawer(): void {
    this.drawerOuvert.set(true);
  }

  fermerDrawer(): void {
    this.drawerOuvert.set(false);
  }
}
