import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  LucideAngularModule,
  User, Building2, Hash, Calendar, Scale, FileText, Gavel, History, Info,
  FolderOpen, Pencil, Plus, Eye, Download, ChevronRight, Users, IdCard,
  LucideIconData
} from 'lucide-angular';

import { messageErreurHttp } from '../../../../shared/utils/http-error.util';
import { PersonneDetailService, PersonneDetailComplet } from '../../services/personne-detail.service';
import { PersonnePhysiqueService } from '../../services/personne-physique.service';
import { PersonneMoraleService } from '../../services/personne-morale.service';
import { AliasService } from '../../services/alias.service';
import { PieceIdentiteService } from '../../services/piece-identite.service';
import {
  PersonnePhysiqueResponse, PersonneMoraleResponse,
  PersonnePhysiqueRequest, PersonneMoraleRequest,
  AliasResponse, PieceIdentiteResponse
} from '../../models/personne.models';
import { environment } from '../../../../../environments/environment';

import { RapportService } from '../../../rapports/services/rapport.service';
import { OngletApercu } from './onglets/onglet-apercu/onglet-apercu';
import { OngletInfos } from './onglets/onglet-infos/onglet-infos';
import { OngletDocuments } from './onglets/onglet-documents/onglet-documents';
import { OngletDossiersImplications } from './onglets/onglet-dossiers-implications/onglet-dossiers-implications';
import { OngletPeines } from './onglets/onglet-peines/onglet-peines';
import { OngletTimeline } from './onglets/onglet-timeline/onglet-timeline';

import { HeroPersonne } from './composants/hero-personne/hero-personne';
import { KpiBarPersonne } from './composants/kpi-bar-personne/kpi-bar-personne';
import { ActionsRapides, TypeActionRapide } from './composants/actions-rapides/actions-rapides';
import {
  MettreAJourStatutDialog,
  DonneesDialogStatut
} from './mettre-a-jour-statut-dialog/mettre-a-jour-statut-dialog';
import {
  PersonnesDuDossierDialog,
  DonneesDialogPersonnesDossier
} from './personnes-du-dossier-dialog/personnes-du-dossier-dialog';

import { PersonnePhysiqueFormDialog } from '../personne-physique-form-dialog/personne-physique-form-dialog';
import { PersonneMoraleFormDialog } from '../personne-morale-form-dialog/personne-morale-form-dialog';

import { PersonneExportUtil } from '../../services/personne-export.util';

interface EvenementHistorique {
  action: string;
  entiteCible: string;
  entiteCibleId: string;
  dateAction: string;
  utilisateur: string;
}

interface StatutJudiciaireCourant {
  libelle: string;
  depuis: string;
  autorite: string | null;
  reference: string | null;
}

@Component({
  selector: 'app-personne-detail',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTabsModule, MatProgressSpinnerModule,
    LucideAngularModule,
    HeroPersonne, KpiBarPersonne,
    OngletApercu, OngletInfos, OngletDocuments, OngletDossiersImplications, OngletPeines, OngletTimeline
  ],
  templateUrl: './personne-detail.html',
  styleUrl: './personne-detail.scss'
})
export class PersonneDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PersonneDetailService);
  private readonly servicePhysique = inject(PersonnePhysiqueService);
  private readonly serviceMorale = inject(PersonneMoraleService);
  private readonly aliasService = inject(AliasService);
  private readonly pieceIdentiteService = inject(PieceIdentiteService);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly rapportService = inject(RapportService);
  private readonly dialog = inject(MatDialog);

  readonly icons: Record<string, LucideIconData> = {
    User, Building2, Hash, Calendar, Scale, FileText, Gavel, History, Info, Users,
    FolderOpen, Pencil, Plus, Eye, Download, ChevronRight, IdCard
  };

  // État du composant
  readonly chargement = signal(true);
  readonly donnees = signal<PersonneDetailComplet | null>(null);
  readonly ongletActif = signal(0);
  readonly nombrePeines = signal(0);
  readonly telechargementDossierId = signal<string | null>(null);

  // Signals pour les alias et pièces d'identité
  readonly aliasListe = signal<AliasResponse[]>([]);
  readonly piecesIdentiteListe = signal<PieceIdentiteResponse[]>([]);

  readonly historique = signal<EvenementHistorique[]>([]);
  readonly chargementHistorique = signal(false);
  private historiqueCharge = false;

  // Gestion de la photo/logo
  readonly photoUrl = signal<string | null>(null);
  private photoBlobUrl: string | null = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Propriétés calculées (Computed)
  // ═══════════════════════════════════════════════════════════════════════════

  readonly detailPhysique = computed<PersonnePhysiqueResponse | null>(() => {
    const d = this.donnees();
    return d?.resume.typePersonne === 'PHYSIQUE'
      ? (d.detail as PersonnePhysiqueResponse)
      : null;
  });

  readonly detailMorale = computed<PersonneMoraleResponse | null>(() => {
    const d = this.donnees();
    return d?.resume.typePersonne === 'MORALE'
      ? (d.detail as PersonneMoraleResponse)
      : null;
  });

  readonly numeroFiche = computed<string>(() => {
    const d = this.donnees();
    if (!d) return '—';
    const prefix = d.resume.typePersonne === 'PHYSIQUE' ? 'PERS' : 'ORG';
    return `${prefix}-${d.resume.id.substring(0, 6).toUpperCase()}`;
  });

  readonly dateInscription = computed<Date | null>(() => {
    const d = this.donnees();
    if (!d) return null;
    return d.detail.dateCreation ? new Date(d.detail.dateCreation) : null;
  });

  readonly creePar = computed<string>(() => {
    const d = this.donnees();
    if (!d) return '—';
    return d.detail.creeParNomComplet || '—';
  });

  readonly statutJudiciaireCourant = computed<StatutJudiciaireCourant | null>(() => {
    const d = this.donnees();
    if (!d || d.implications.length === 0) return null;

    const implicationsAvecStatut = [...d.implications]
      .filter((i) => i.statutJudiciaireId)
      .sort((a, b) => {
        const dA = a.dateDebut ? new Date(a.dateDebut).getTime() : 0;
        const dB = b.dateDebut ? new Date(b.dateDebut).getTime() : 0;
        return dB - dA;
      });

    if (implicationsAvecStatut.length === 0) return null;
    const derniere = implicationsAvecStatut[0];
    return {
      libelle: derniere.statutJudiciaireLibelle || 'Statut inconnu',
      depuis: derniere.dateDebut,
      autorite: derniere.autoriteCompetente || null,
      reference: derniere.referenceAffaire || null
    };
  });

  readonly nombreDossiers = computed(() => {
    const d = this.donnees();
    return d?.dossiers.length ?? 0;
  });

  readonly nombreDocuments = computed(() => {
    const d = this.donnees();
    return d?.documents.length ?? 0;
  });

  readonly derniereMiseAJour = computed<Date | null>(() => {
    const d = this.donnees();
    if (!d) return null;
    const detail = d.detail;

    const dates: Date[] = [];
    if (detail.dateModification) dates.push(new Date(detail.dateModification));
    if (detail.dateCreation) dates.push(new Date(detail.dateCreation));

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(date => date.getTime())));
  });

  readonly nombreFaitsPropres = computed(() => {
    const d = this.donnees();
    if (!d) return 0;
    const faitsUniques = new Set(
      (d.implicationFaits || []).map((lf) => lf.faitReprocheId)
    );
    return faitsUniques.size;
  });

  readonly faitsPropresIds = computed(() => {
    const d = this.donnees();
    if (!d) return new Set<string>();
    return new Set((d.implicationFaits || []).map((lf) => lf.faitReprocheId));
  });

  readonly faitsPropres = computed(() => {
    const d = this.donnees();
    if (!d) return [];
    const idsAutorises = this.faitsPropresIds();
    return (d.faits || []).filter((f) => idsAutorises.has(f.id));
  });

  readonly ageAffichage = computed<string>(() => {
    const p = this.detailPhysique();
    if (!p?.dateNaissance) return '';
    const naissance = new Date(p.dateNaissance);
    const auj = new Date();
    let age = auj.getFullYear() - naissance.getFullYear();
    const m = auj.getMonth() - naissance.getMonth();
    if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) age--;
    return ` (${age} ans)`;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/personnes']);
        return;
      }
      this.chargerDetails(id);
      this.historiqueCharge = false;
    });
  }

  private chargerDetails(id: string): void {
    this.chargement.set(true);
    this.service.chargerToutesLesDonnees(id).subscribe({
      next: (data) => {
        this.donnees.set(data);
        this.chargement.set(false);
        this.chargerPhotoSiPresente(data);
        this.chargerAliasEtPieces(id, data.resume.typePersonne);
      },
      error: () => {
        this.toastr.error('Impossible de charger la fiche personne');
        this.chargement.set(false);
      }
    });
  }

  /**
   * Charge les alias (physiques ET morales) et pièces d'identité (physiques uniquement).
   */
  private chargerAliasEtPieces(personneId: string, typePersonne: string): void {
    this.aliasService.lister(personneId).subscribe({
      next: (liste) => this.aliasListe.set(liste),
      error: () => this.aliasListe.set([])
    });

    if (typePersonne === 'PHYSIQUE') {
      this.pieceIdentiteService.lister(personneId).subscribe({
        next: (liste) => this.piecesIdentiteListe.set(liste),
        error: () => this.piecesIdentiteListe.set([])
      });
    }
  }

  private chargerPhotoSiPresente(data: PersonneDetailComplet): void {
    // Photo pour une personne physique, logo pour une personne morale.
    const detail = data.detail as { aUnePhoto?: boolean; aUnLogo?: boolean };
    if (!detail.aUnePhoto && !detail.aUnLogo) {
      this.libererAnciennePhoto();
      this.photoUrl.set(null);
      return;
    }

    this.http.get(`${environment.apiUrl}/personnes/${data.resume.id}/photo`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        this.libererAnciennePhoto();
        const url = URL.createObjectURL(blob);
        this.photoBlobUrl = url;
        this.photoUrl.set(url);
      },
      error: (err) => {
        console.error('Impossible de charger la photo/logo', err);
        this.libererAnciennePhoto();
        this.photoUrl.set(null);
      }
    });
  }

  private libererAnciennePhoto(): void {
    if (this.photoBlobUrl) {
      URL.revokeObjectURL(this.photoBlobUrl);
      this.photoBlobUrl = null;
    }
  }

  chargerHistoriqueSiNecessaire(): void {
    if (this.historiqueCharge) return;
    const d = this.donnees();
    if (!d) return;

    this.chargementHistorique.set(true);
    this.http.get<EvenementHistorique[]>(
      `${environment.apiUrl}/personnes/${d.resume.id}/historique-statuts`
    ).subscribe({
      next: (evts) => {
        this.historique.set(evts);
        this.chargementHistorique.set(false);
        this.historiqueCharge = true;
      },
      error: () => {
        this.chargementHistorique.set(false);
        this.toastr.error('Impossible de charger l\'historique');
      }
    });
  }

  rechargerFiche(): void {
    const d = this.donnees();
    if (!d) return;
    this.donnees.set(null);
    this.chargerDetails(d.resume.id);
  }

  retourListe(): void {
    this.router.navigate(['/personnes']);
  }

  retourRegistreOfficiel(): void {
    this.router.navigate(['/registre-officiel']);
  }

  ouvrirModifier(): void {
    const d = this.donnees();
    if (!d) return;

    if (d.resume.typePersonne === 'PHYSIQUE') {
      this.servicePhysique.obtenir(d.resume.id).subscribe({
        next: (detail) => this.ouvrirDialogPhysique(detail),
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Impossible de charger la fiche'))
      });
    } else {
      this.serviceMorale.obtenir(d.resume.id).subscribe({
        next: (detail) => this.ouvrirDialogMorale(detail),
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Impossible de charger la fiche'))
      });
    }
  }

  private ouvrirDialogPhysique(existant: PersonnePhysiqueResponse): void {
    const ref = this.dialog.open(PersonnePhysiqueFormDialog, {
      width: '700px',
      data: existant
    });
    ref.afterClosed().subscribe((request: PersonnePhysiqueRequest | undefined) => {
      if (!request) return;
      this.servicePhysique.modifier(existant.id, request).subscribe({
        next: () => {
          this.toastr.success('Personne physique modifiée');
          this.rechargerFiche();
        },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Échec de la modification'))
      });
    });
  }

  private ouvrirDialogMorale(existant: PersonneMoraleResponse): void {
    const ref = this.dialog.open(PersonneMoraleFormDialog, {
      width: '700px',
      data: existant
    });
    ref.afterClosed().subscribe((request: PersonneMoraleRequest | undefined) => {
      if (!request) return;
      this.serviceMorale.modifier(existant.id, request).subscribe({
        next: () => {
          this.toastr.success('Personne morale modifiée');
          this.rechargerFiche();
        },
        error: (err) => this.toastr.error(messageErreurHttp(err, 'Échec de la modification'))
      });
    });
  }

  ouvrirAjouterDossier(): void {
    const d = this.donnees();
    if (!d) return;
    this.router.navigate(['/personnes', d.resume.id, 'dossiers', 'nouveau']);
  }

  allerRapports(): void {
    this.router.navigate(['/rapports']);
  }

  voirDossier(dossierId: string): void {
    this.router.navigate(['/dossiers', dossierId]);
  }

  telechargerPdfDossier(dossierId: string, numeroDossier?: string): void {
    this.telechargementDossierId.set(dossierId);
    this.rapportService.pdfDossier(dossierId).subscribe({
      next: (blob) => {
        const nom = numeroDossier
          ? `dossier-${numeroDossier}.pdf`
          : `dossier-${dossierId.substring(0, 8)}.pdf`;
        this.rapportService.telecharger(blob, nom);
        this.toastr.success('PDF téléchargé');
        this.telechargementDossierId.set(null);
      },
      error: () => {
        this.toastr.error('Impossible de générer le PDF');
        this.telechargementDossierId.set(null);
      }
    });
  }

  onNaviguerVersOnglet(index: number): void {
    this.ongletActif.set(index);
    if (index === 6) this.chargerHistoriqueSiNecessaire();
  }

  onOngletChange(index: number): void {
    this.ongletActif.set(index);
    if (index === 6) this.chargerHistoriqueSiNecessaire();
  }

  libelleSexe(sexe: string | undefined): string {
    if (!sexe) return '—';
    return sexe === 'M' ? 'Masculin' : sexe === 'F' ? 'Féminin' : sexe;
  }

  libelleSituation(situation: string | undefined): string {
    if (!situation) return '—';
    const map: Record<string, string> = {
      CELIBATAIRE: 'Célibataire',
      MARIE: 'Marié(e)',
      DIVORCE: 'Divorcé(e)',
      VEUF: 'Veuf/Veuve'
    };
    return map[situation] || situation;
  }

  libelleAction(action: string): string {
    const map: Record<string, string> = {
      CREATION: 'Création de l\'implication',
      MODIFICATION: 'Modification du statut',
      MODIFICATION_STATUT_JUDICIAIRE: 'Modification du statut judiciaire',
      SUPPRESSION: 'Suppression de l\'implication',
      INSERT: 'Ajout',
      UPDATE: 'Mise à jour',
      DELETE: 'Suppression'
    };
    return map[action] || action;
  }

  ouvrirMiseAJourStatut(): void {
    const d = this.donnees();
    if (!d) return;

    const liaisonsAvecStatut = [...(d.implicationFaits || [])]
      .filter((lf) => lf.statutJudiciaireId);

    const liaison = liaisonsAvecStatut[0] || (d.implicationFaits || [])[0];

    if (!liaison) {
      this.toastr.warning(
        'Cette personne n\'a aucun fait reproché. Ajoutez d\'abord un dossier avec un fait pour définir un statut judiciaire.'
      );
      return;
    }

    const implication = d.implications.find((i) => i.id === liaison.implicationId);
    const dossier = implication ? d.dossiers.find(dos => dos.id === implication.dossierId) : undefined;
    const fait = (d.faits || []).find((f) => f.id === liaison.faitReprocheId);

    const donnees: DonneesDialogStatut = {
      implicationFaitId: liaison.id,
      personneNomAffichage: d.resume.nomAffichage,
      faitLibelle: fait?.typeInfractionLibelle,
      dossierIntitule: dossier?.intitule,
      numeroDossier: dossier?.numeroDossier,
      statutActuelLibelle: liaison.statutJudiciaireLibelle || 'Aucun statut'
    };

    const ref = this.dialog.open(MettreAJourStatutDialog, {
      data: donnees,
      panelClass: 'dialog-statut-panel',
      autoFocus: false
    });

    ref.afterClosed().subscribe((modifie) => {
      if (modifie) this.rechargerFiche();
    });
  }

  voirPersonnesDossier(dossierId: string, dossierIntitule?: string, numeroDossier?: string): void {
    const d = this.donnees();
    if (!d) return;

    const donnees: DonneesDialogPersonnesDossier = {
      dossierId,
      dossierIntitule: dossierIntitule || 'Sans intitulé',
      numeroDossier,
      personneCouranteId: d.resume.id
    };

    this.dialog.open(PersonnesDuDossierDialog, {
      data: donnees,
      panelClass: 'dialog-personnes-panel',
      autoFocus: false,
      width: '620px'
    });
  }

  exporterPdf(): void {
    const d = this.donnees();
    if (!d) {
      this.toastr.warning('Aucune donnée à exporter');
      return;
    }

    try {
      PersonneExportUtil.telechargerPdf(d, this.numeroFiche());
      this.toastr.success('Boîte d\'impression ouverte — choisissez "Enregistrer en PDF"');
    } catch (err) {
      console.error('Échec de l\'export PDF', err);
      this.toastr.error('Impossible d\'ouvrir la boîte d\'impression');
    }
  }

  gererActionRapide(type: TypeActionRapide): void {
    switch (type) {
      case 'dossier':
        this.ouvrirAjouterDossier();
        break;
      case 'implication':
        this.toastr.info(
          'Passez par l\'onglet "Dossiers & implications" pour ajouter une implication à un dossier existant'
        );
        this.ongletActif.set(2);
        break;
      case 'peine':
        this.toastr.info(
          'Passez par l\'onglet "Peines & sanctions" pour ajouter une peine à une implication existante'
        );
        this.ongletActif.set(3);
        break;
      case 'document':
        this.toastr.info('Passez par l\'onglet "Documents" pour uploader une pièce jointe');
        this.ongletActif.set(5);
        break;
      case 'statut':
        this.ouvrirMiseAJourStatut();
        break;
      case 'photo':
        this.toastr.info('Le changement de photo sera disponible dans la prochaine mise à jour');
        break;
      case 'alias':
        this.ajouterAlias();
        break;
      case 'piece-identite':
        this.ajouterPiece();
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions déléguées depuis l'onglet Aperçu
  // ═══════════════════════════════════════════════════════════════════════════

  allerAuxInfos(): void {
    this.ongletActif.set(1);
  }

  allerAuxDossiers(): void {
    this.ongletActif.set(2);
  }

  allerAuxPeines(): void {
    this.ongletActif.set(3);
  }

  ouvrirDossier(dossierId: string): void {
    this.router.navigate(['/dossiers', dossierId]);
  }

  ajouterAlias(): void {
    this.toastr.info('Passez par "Modifier la fiche" pour ajouter un alias');
    this.ongletActif.set(1);
  }

  ajouterPiece(): void {
    this.toastr.info('Passez par "Modifier la fiche" pour ajouter une pièce d\'identité');
    this.ongletActif.set(1);
  }
}
