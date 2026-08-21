import { Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  User, Users, MapPin, Flag, Calendar, IdCard, Tag,
  FolderOpen, FileText, Gavel, Plus, ArrowRight, MoreVertical,
  ChevronDown, Info, ExternalLink, ShieldCheck,
  LucideIconData
} from 'lucide-angular';

import { PersonneDetailComplet } from '../../../../services/personne-detail.service';
import {
  PersonnePhysiqueResponse, PersonneMoraleResponse,
  DossierResponse, PeineResponse,
  AliasResponse, PieceIdentiteResponse
} from '../../../../models/personne.models';

/**
 * Onglet Aperçu : vitrine à 3 colonnes de la fiche personne.
 * - Col 1 : Informations clés
 * - Col 2 : Alias & Pièces d'identité
 * - Col 3 : Dossier(s) & Faits reprochés & Peines
 *
 * Toutes les actions "+ Ajouter" et "Voir tous" sont déléguées au parent.
 */
@Component({
  selector: 'app-onglet-apercu',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DecimalPipe,
    MatTooltipModule, LucideAngularModule
  ],
  templateUrl: './onglet-apercu.html',
  styleUrl: './onglet-apercu.scss'
})
export class OngletApercu {
  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly donnees = input.required<PersonneDetailComplet>();
  readonly nombrePeines = input<number>(0);
  readonly alias = input<AliasResponse[]>([]);
  readonly piecesIdentite = input<PieceIdentiteResponse[]>([]);

  // ─── Sorties (actions déléguées au parent) ────────────────────────────────
  readonly voirToutesInfos = output<void>();
  readonly ajouterAlias = output<void>();
  readonly voirTousAlias = output<void>();
  readonly ajouterPiece = output<void>();
  readonly voirToutesPieces = output<void>();
  readonly voirDossier = output<string>();     // dossierId
  readonly voirTousFaits = output<void>();
  readonly voirToutesPeines = output<void>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    User, Users, MapPin, Flag, Calendar, IdCard, Tag,
    FolderOpen, FileText, Gavel, Plus, ArrowRight, MoreVertical,
    ChevronDown, Info, ExternalLink, ShieldCheck
  };

  // ─── Détails typés ─────────────────────────────────────────────────────────
  readonly detailPhysique = computed<PersonnePhysiqueResponse | null>(() => {
    const d = this.donnees();
    return d.resume.typePersonne === 'PHYSIQUE'
      ? (d.detail as PersonnePhysiqueResponse)
      : null;
  });

  readonly detailMorale = computed<PersonneMoraleResponse | null>(() => {
    const d = this.donnees();
    return d.resume.typePersonne === 'MORALE'
      ? (d.detail as PersonneMoraleResponse)
      : null;
  });

  readonly estPhysique = computed(() => this.donnees().resume.typePersonne === 'PHYSIQUE');

  // ─── Âge affiché ───────────────────────────────────────────────────────────
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

  // ─── Alias — vient maintenant du parent ────────────────────────────────────
  readonly aliasAffiches = computed(() => this.alias().slice(0, 3));
  readonly nombreAliasTotal = computed(() => this.alias().length);

  // ─── Pièces d'identité — vient maintenant du parent ────────────────────────
  readonly piecesAffichees = computed(() => this.piecesIdentite().slice(0, 1));
  readonly nombrePiecesTotal = computed(() => this.piecesIdentite().length);

  // ─── Faits reprochés spécifiques à la personne (via implicationFaits) ────
  readonly faitsPropres = computed(() => {
    const d = this.donnees();
    if (!d) return [];
    const idsAutorises = new Set(
      (d.implicationFaits || []).map(lf => lf.faitReprocheId)
    );
    return d.faits
      .filter(f => idsAutorises.has(f.id))
      .slice(0, 4);   // Aperçu : max 4 faits
  });

  readonly nombreFaitsTotal = computed(() => {
    const d = this.donnees();
    if (!d) return 0;
    const idsAutorises = new Set(
      (d.implicationFaits || []).map(lf => lf.faitReprocheId)
    );
    return d.faits.filter(f => idsAutorises.has(f.id)).length;
  });

  // ─── Dossier principal (le plus récent) ───────────────────────────────────
  readonly dossierPrincipal = computed<DossierResponse | null>(() => {
    const d = this.donnees();
    if (!d || d.dossiers.length === 0) return null;
    // Le plus récent en date d'ouverture
    const tries = [...d.dossiers].sort((a: any, b: any) => {
      const dA = a.dateOuverture ? new Date(a.dateOuverture).getTime() : 0;
      const dB = b.dateOuverture ? new Date(b.dateOuverture).getTime() : 0;
      return dB - dA;
    });
    return tries[0];
  });

  readonly nombreDossiersTotal = computed(() => this.donnees().dossiers.length);

  // ─── Peine principale (la plus récente) ───────────────────────────────────
  readonly peinePrincipale = computed(() => {
    const d = this.donnees();
    if (!d || !d.peines || d.peines.length === 0) return null;
    // Peine avec la date de décision la plus récente
    const tries = [...d.peines].sort((a: any, b: any) => {
      const dA = a.dateDecision ? new Date(a.dateDecision).getTime() : 0;
      const dB = b.dateDecision ? new Date(b.dateDecision).getTime() : 0;
      return dB - dA;
    });
    return tries[0];
  });

  // ─── Libellés ──────────────────────────────────────────────────────────────
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

  libelleTypePeine(type: string | undefined): string {
    if (!type) return '—';
    const map: Record<string, string> = {
      PRISON: 'Peine de prison',
      AMENDE: 'Amende',
      CONFISCATION: 'Confiscation',
      RADIATION: 'Radiation',
      AUTRE: 'Autre'
    };
    return map[type] || type;
  }

  libelleStatutDossier(statut: string | undefined): string {
    if (!statut) return '—';
    const map: Record<string, string> = {
      OUVERT: 'En cours',
      CLOTURE: 'Clôturé'
    };
    return map[statut] || statut;
  }

  classeStatutDossier(statut: string | undefined): string {
    if (statut === 'OUVERT') return 'badge-statut--en-cours';
    if (statut === 'CLOTURE') return 'badge-statut--clos';
    return 'badge-statut--neutre';
  }
}
