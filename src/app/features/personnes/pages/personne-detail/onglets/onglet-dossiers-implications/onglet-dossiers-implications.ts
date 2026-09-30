import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  LucideAngularModule,
  Plus, FolderOpen, Folder, Gavel, Eye, ExternalLink, MoreVertical,
  Search, Filter, List, LayoutGrid, ChevronLeft, ChevronRight,
  FileText, User, Users, Clock, CheckCircle2, AlertCircle, XCircle, Info,
  LucideIconData
} from 'lucide-angular';

import {
  ImplicationResponse, FaitReprocheResponse, DossierResponse, ImplicationFaitResume
} from '../../../../models/personne.models';
import { AjouterImplicationDialog } from '../../../ajouter-implication-dialog/ajouter-implication-dialog';
import { ReprocherFaitDialog } from '../../../reprocher-fait-dialog/reprocher-fait-dialog';
import { AjouterPeineDialog } from '../../ajouter-peine-dialog/ajouter-peine-dialog';
import { PersonnesDuDossierDialog } from '../../personnes-du-dossier-dialog/personnes-du-dossier-dialog';
import { FaitsDuDossierDialog } from '../../../../dialogs/faits-du-dossier-dialog/faits-du-dossier-dialog';
import { NomAccessibleInfobulle } from '../../../../../../shared/a11y/nom-accessible-infobulle';

interface GroupeDossier {
  dossier: DossierResponse;
  implication?: ImplicationResponse;
  faits: FaitReprocheResponse[];
  nombreFaits: number;
}

interface ResumeStatut {
  code: string;
  libelle: string;
  nombre: number;
  couleur: string;
}

@Component({
  selector: 'app-onglet-dossiers-implications',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    MatTooltipModule, NomAccessibleInfobulle, MatMenuModule, MatPaginatorModule,
    LucideAngularModule
  ],
  templateUrl: './onglet-dossiers-implications.html',
  styleUrl: './onglet-dossiers-implications.scss'
})
export class OngletDossiersImplications {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly personneId = input.required<string>();
  readonly personneNomAffichage = input.required<string>();
  readonly dossiers = input.required<DossierResponse[]>();
  readonly implications = input.required<ImplicationResponse[]>();
  readonly faits = input.required<FaitReprocheResponse[]>();
  readonly implicationFaits = input.required<ImplicationFaitResume[]>();
  readonly dernierUtilisateur = input<string>('—');
  readonly derniereModification = input<Date | string | null>(null);

  // ─── Sortie ────────────────────────────────────────────────────────────────
  readonly donneesModifiees = output<void>();

  // ─── État UI ───────────────────────────────────────────────────────────────
  readonly vue = signal<'liste' | 'carte'>('liste');
  readonly recherche = signal<string>('');
  readonly filtreStatut = signal<string | null>(null);
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(4);

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    Plus, FolderOpen, Folder, Gavel, Eye, ExternalLink, MoreVertical,
    Search, Filter, List, LayoutGrid, ChevronLeft, ChevronRight,
    FileText, User, Users, Clock, CheckCircle2, AlertCircle, XCircle, Info
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Groupes de dossiers avec faits filtrés (fix bug Lot 1)
  // ═══════════════════════════════════════════════════════════════════════════
  readonly groupesTous = computed<GroupeDossier[]>(() => {
    const faitsPropresIds = new Set(
      this.implicationFaits().map(lf => lf.faitReprocheId)
    );
    return this.dossiers().map((dossier) => {
      const faitsFiltre = this.faits().filter(
        (f) => f.dossierId === dossier.id && faitsPropresIds.has(f.id)
      );
      return {
        dossier,
        implication: this.implications().find((i) => i.dossierId === dossier.id),
        faits: faitsFiltre,
        nombreFaits: faitsFiltre.length
      };
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filtres appliqués (recherche + statut) + pagination
  // ═══════════════════════════════════════════════════════════════════════════
  readonly groupesFiltres = computed<GroupeDossier[]>(() => {
    let liste = this.groupesTous();

    // Filtre recherche
    const q = this.recherche().trim().toLowerCase();
    if (q) {
      liste = liste.filter((g) => {
        const numero = (g.dossier.numeroDossier || '').toLowerCase();
        const intitule = (g.dossier.intitule || '').toLowerCase();
        const fonction = (g.implication?.fonctionOccupee || '').toLowerCase();
        return numero.includes(q) || intitule.includes(q) || fonction.includes(q);
      });
    }

    // Filtre statut
    const s = this.filtreStatut();
    if (s) {
      liste = liste.filter((g) => g.dossier.statutDossier === s);
    }

    return liste;
  });

  readonly groupesPageActive = computed<GroupeDossier[]>(() => {
    const debut = this.pageIndex() * this.pageSize();
    return this.groupesFiltres().slice(debut, debut + this.pageSize());
  });

  readonly nombreTotalFiltres = computed(() => this.groupesFiltres().length);

  // ═══════════════════════════════════════════════════════════════════════════
  // Résumés pour la colonne latérale
  // ═══════════════════════════════════════════════════════════════════════════
  readonly resumeStatuts = computed<ResumeStatut[]>(() => {
    const groupes = this.groupesTous();
    const compter = (statut: string) => groupes.filter((g) => g.dossier.statutDossier === statut).length;
    return [
      { code: 'OUVERT',         libelle: 'Dossiers ouverts',  nombre: compter('OUVERT'),        couleur: 'vert' },
      { code: 'EN_COURS',       libelle: 'En cours',          nombre: compter('EN_COURS'),      couleur: 'ambre' },
      { code: 'EN_INSTRUCTION', libelle: 'En instruction',    nombre: compter('EN_INSTRUCTION'),couleur: 'bleu' },
      { code: 'CLOTURE',        libelle: 'Clôturés',          nombre: compter('CLOTURE'),        couleur: 'gris' }
    ];
  });

  readonly totalDossiers = computed(() => this.groupesTous().length);

  readonly resumeFaits = computed(() => {
    const tousFaits = this.groupesTous().flatMap((g) => g.faits);
    const compter = (statut: string) => tousFaits.filter((f) => f.statutValidation === statut).length;
    return {
      total: tousFaits.length,
      valides: compter('VALIDEE'),
      enAttente: compter('EN_ATTENTE'),
      rejetes: compter('REJETEE')
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Style dynamique pour le badge statut
  // ═══════════════════════════════════════════════════════════════════════════
  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      'OUVERT': 'Ouvert',
      'EN_COURS': 'En cours',
      'EN_INSTRUCTION': 'En instruction',
      'CLOTURE': 'Clôturé'
    };
    return map[statut] || statut;
  }

  classeStatut(statut: string): string {
    const map: Record<string, string> = {
      'OUVERT': 'badge--vert',
      'EN_COURS': 'badge--ambre',
      'EN_INSTRUCTION': 'badge--bleu',
      'CLOTURE': 'badge--gris'
    };
    return map[statut] || 'badge--gris';
  }

  classeIconeDossier(statut: string): string {
    const map: Record<string, string> = {
      'OUVERT': 'icone-dossier--vert',
      'EN_COURS': 'icone-dossier--ambre',
      'EN_INSTRUCTION': 'icone-dossier--bleu',
      'CLOTURE': 'icone-dossier--gris'
    };
    return map[statut] || 'icone-dossier--gris';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions filtre / pagination / navigation
  // ═══════════════════════════════════════════════════════════════════════════
  filtrerParStatut(statut: string): void {
    this.filtreStatut.set(this.filtreStatut() === statut ? null : statut);
    this.pageIndex.set(0);
  }

  reinitialiserFiltres(): void {
    this.recherche.set('');
    this.filtreStatut.set(null);
    this.pageIndex.set(0);
  }

  changerPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  ouvrirDossier(dossierId: string): void {
    this.router.navigate(['/dossiers', dossierId]);
  }

  ouvrirDossierNouvelOnglet(dossierId: string): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/dossiers', dossierId])
    );
    window.open(url, '_blank');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Dialogs : voir personnes / voir faits d'un dossier
  // ═══════════════════════════════════════════════════════════════════════════
  voirPersonnesDuDossier(groupe: GroupeDossier): void {
    const ref = this.dialog.open(PersonnesDuDossierDialog, {
      data: {
        dossierId: groupe.dossier.id,
        dossierIntitule: groupe.dossier.intitule || 'Sans intitulé',
        numeroDossier: groupe.dossier.numeroDossier,
        personneCouranteId: this.personneId()
      },
      width: '620px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      panelClass: 'dialog-personnes-du-dossier-panel',
      autoFocus: false
    });

    ref.afterClosed().subscribe((resultat?: { modifie?: boolean }) => {
      if (resultat?.modifie) {
        this.donneesModifiees.emit();
      }
    });
  }

  voirFaitsDuDossier(groupe: GroupeDossier): void {
    const faitsPropresIds = new Set(this.implicationFaits().map(lf => lf.faitReprocheId));

    const ref = this.dialog.open(FaitsDuDossierDialog, {
      data: {
        dossierId: groupe.dossier.id,
        dossierIntitule: groupe.dossier.intitule || 'Sans intitulé',
        numeroDossier: groupe.dossier.numeroDossier,
        personneCouranteId: this.personneId(),
        personneCouranteNom: this.personneNomAffichage(),
        faitsPropresIds: Array.from(faitsPropresIds),
        implicationCourante: groupe.implication
      },
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      panelClass: 'dialog-faits-du-dossier-panel',
      autoFocus: false
    });

    ref.afterClosed().subscribe((resultat?: { modifie?: boolean }) => {
      if (resultat?.modifie) {
        this.donneesModifiees.emit();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions peine / fait / implication
  // ═══════════════════════════════════════════════════════════════════════════
  private trouverImplicationFaitId(fait: FaitReprocheResponse): string | null {
    const liaison = this.implicationFaits().find(
      (l) => l.faitReprocheId === fait.id
    );
    return liaison?.id ?? null;
  }

  peutAjouterPeine(fait: FaitReprocheResponse): boolean {
    return fait.statutValidation === 'VALIDEE'
        && this.trouverImplicationFaitId(fait) !== null;
  }

  ajouterPeine(fait: FaitReprocheResponse, groupe: GroupeDossier): void {
    const implicationFaitId = this.trouverImplicationFaitId(fait);
    if (!implicationFaitId) return;
    const ref = this.dialog.open(AjouterPeineDialog, {
      data: {
        implicationFaitId,
        contexte: {
          personneNom: this.personneNomAffichage(),
          faitDescription: fait.description,
          typeInfraction: fait.typeInfractionLibelle,
          numeroDossier: groupe.dossier.numeroDossier
        }
      },
      width: '520px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe((peine) => {
      if (peine) this.donneesModifiees.emit();
    });
  }

  ouvrirNouvelleImplication(): void {
    const ref = this.dialog.open(AjouterImplicationDialog, {
      data: {
        personneId: this.personneId(),
        personneNomAffichage: this.personneNomAffichage(),
        dossiersDejaLies: this.dossiers().map((d) => d.id)
      },
      width: '900px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe((resultat) => {
      if (resultat?.cree) this.donneesModifiees.emit();
    });
  }

  ajouterFait(groupe: GroupeDossier): void {
    if (!groupe.implication) return;
    const ref = this.dialog.open(ReprocherFaitDialog, {
      data: {
        personneId: this.personneId(),
        personneNomAffichage: this.personneNomAffichage(),
        implicationsActuelles: [groupe.implication]
      },
      width: '900px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe((resultat) => {
      if (resultat?.cree) this.donneesModifiees.emit();
    });
  }
}
