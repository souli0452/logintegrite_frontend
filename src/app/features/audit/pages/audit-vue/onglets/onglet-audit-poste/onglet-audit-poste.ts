import { Component, inject, signal } from '@angular/core';
import { ChargementListe } from '../../../../../../shared/ui/chargement-liste/chargement-liste';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';

import { EmptyState } from '../../../../../../shared/ui/empty-state/empty-state';
import { AuditService } from '../../../../services/audit.service';
import { EvenementSecurite } from '../../../../models/audit.models';
import { PaginatorFrancais } from '../../../../../../core/i18n/paginator-francais';

/** Tentatives de copie, d'impression, de capture ou d'ouverture des outils de développement, par utilisateur. */
@Component({
  selector: 'app-onglet-audit-poste',
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorFrancais }],
  standalone: true,
  imports: [ChargementListe, DatePipe, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule, EmptyState],
  templateUrl: './onglet-audit-poste.html',
  styleUrl: '../onglet-audit-consultations/onglet-audit-consultations.scss'
})
export class OngletAuditPoste {
  private readonly service = inject(AuditService);
  private readonly toastr = inject(ToastrService);

  readonly entries = signal<EvenementSecurite[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly taille = signal(20);
  readonly chargement = signal(true);
  readonly filtre = signal('');
  readonly colonnes = ['date', 'type', 'utilisateur', 'detail', 'adresseIp'];

  private readonly libelles: Record<string, string> = {
    COPIE_TENTEE: 'Tentative de copie',
    COUPE_TENTEE: 'Tentative de couper',
    IMPRESSION_TENTEE: "Tentative d'impression",
    MENU_CONTEXTUEL: 'Clic droit',
    CAPTURE_SUSPECTE: 'Touche « Impr. écran »',
    OUTILS_DEVELOPPEUR: 'Outils de développement',
    VERIFICATION_RECHERCHE: 'Recherche de vérification',
    DEMANDE_EXPORT: "Demande d'export",
    DEMANDE_EXPORT_ACCORDEE: 'Demande accordée',
    DEMANDE_EXPORT_REFUSEE: 'Demande refusée',
  };
  readonly types = [{ valeur: '', libelle: 'Tous les événements' },
    ...Object.entries(this.libelles).map(([valeur, libelle]) => ({ valeur, libelle }))];

  constructor() { this.charger(); }

  libelle(t: string): string { return this.libelles[t] ?? t; }

  charger(): void {
    this.chargement.set(true);
    this.service.listerEvenementsPoste(this.page(), this.taille(), this.filtre() || undefined).subscribe({
      next: (p) => { this.entries.set(p.content); this.total.set(p.totalElements); this.chargement.set(false); },
      error: () => { this.toastr.error('Impossible de charger les événements du poste'); this.chargement.set(false); }
    });
  }

  changerPage(e: PageEvent): void { this.page.set(e.pageIndex); this.taille.set(e.pageSize); this.charger(); }
  changerFiltre(v: string): void { this.filtre.set(v); this.page.set(0); this.charger(); }
}
