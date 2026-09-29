import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  LucideAngularModule,
  ArrowLeft, ChevronDown, Pencil, FolderPlus,
  Download, Copy, Printer, User, Building2, ImageOff,
  Calendar, MapPin, Flag, IdCard, Phone, Briefcase,
  Scale, ShieldCheck, ShieldAlert, Clock, FileText,
  FileDown, ScrollText, CheckCircle2, UserCog, Users,
  Mail, Hash,
  LucideIconData
} from 'lucide-angular';

import { PersonneDetailComplet } from '../../../../services/personne-detail.service';
import { PersonnePhysiqueResponse, PersonneMoraleResponse } from '../../../../models/personne.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero-personne',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatTooltipModule, LucideAngularModule],
  templateUrl: './hero-personne.html',
  styleUrl: './hero-personne.scss'
})
export class HeroPersonne {
  private readonly snack = inject(MatSnackBar);

  // ─── Entrées ───────────────────────────────────────────────────────────────
  readonly donnees = input.required<PersonneDetailComplet>();
  readonly photoUrl = input<string | null>(null);
  readonly numeroFiche = input.required<string>();
  readonly dateInscription = input<Date | null>(null);
  readonly creePar = input<string>('—');

  // ─── Sorties ───────────────────────────────────────────────────────────────
  readonly retour = output<void>();
  readonly retourRegistreOfficiel = output<void>();
  readonly modifier = output<void>();
  readonly ajouterDossier = output<void>();
  readonly voirRapports = output<void>();
  readonly modifierStatut = output<void>();
  readonly exporterPdf = output<void>();

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    ArrowLeft, ChevronDown, Pencil, FolderPlus,
    Download, Copy, Printer, User, Building2, ImageOff,
    Calendar, MapPin, Flag, IdCard, Phone, Briefcase,
    Scale, ShieldCheck, ShieldAlert, Clock, FileText,
    FileDown, ScrollText, CheckCircle2, UserCog, Users,
    Mail, Hash
  };

  // ─── Type de personne ──────────────────────────────────────────────────────
  readonly estPhysique = computed(() => this.donnees().resume.typePersonne === 'PHYSIQUE');
  readonly estMorale = computed(() => this.donnees().resume.typePersonne === 'MORALE');

  readonly detailPhysique = computed<PersonnePhysiqueResponse | null>(() => {
    const d = this.donnees();
    return d.resume.typePersonne === 'PHYSIQUE' ? (d.detail as PersonnePhysiqueResponse) : null;
  });

  readonly detailMorale = computed<PersonneMoraleResponse | null>(() => {
    const d = this.donnees();
    return d.resume.typePersonne === 'MORALE' ? (d.detail as PersonneMoraleResponse) : null;
  });

  // ─── Ancrage au registre officiel (pour badge de validation) ──────────────
  readonly estAuRegistreOfficiel = computed(() =>
    this.donnees().resume.statutAncrage === 'REGISTRE_OFFICIEL'
  );

  // ─── ID technique de la personne (affiché sous le nom) ─────────────────────
  readonly idPersonne = computed(() => this.donnees().resume.id);


  readonly nipAffichage = computed<string | null>(() => {
    const p = this.detailPhysique();
    return p?.nip || null;
  });

  // ─── Âge calculé pour personne physique ────────────────────────────────────
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

  // ─── Statut judiciaire courant ─────────────────────────────────────────────
  readonly statutJudiciaire = computed(() => {
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
      libelle: (derniere.statutJudiciaireLibelle || 'Statut inconnu') as string,
      depuis: derniere.dateDebut as string,
      autorite: (derniere.autoriteCompetente || null) as string | null,
      reference: (derniere.referenceAffaire || null) as string | null,
      nbImplications: implicationsAvecStatut.length
    };
  });

  readonly variantStatut = computed<'critique' | 'attention' | 'positif' | 'neutre'>(() => {
    const s = this.statutJudiciaire();
    if (!s) return 'neutre';
    const l = s.libelle.toLowerCase();
    if (/(condamn|poursuiv|mis en examen|inculp|renvoy)/.test(l)) return 'critique';
    if (/(relax|acquitt|non[-\s]?lieu|innoc)/.test(l)) return 'positif';
    if (/(enqu[êe]t|instruction|attente|suspect|convoq)/.test(l)) return 'attention';
    return 'neutre';
  });

  // ─── Libellés utilitaires ──────────────────────────────────────────────────
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

  // ─── Actions ───────────────────────────────────────────────────────────────
  async copierId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.idPersonne());
      this.snack.open('ID Personne copié', 'Fermer', {
        duration: 2000,
        panelClass: 'toast-succes'
      });
    } catch {
      this.snack.open('Impossible de copier', 'Fermer', { duration: 2500 });
    }
  }


  async copierNip(): Promise<void> {
    const nip = this.nipAffichage();
    if (!nip) return;
    try {
      await navigator.clipboard.writeText(nip);
      this.snack.open('NIP CNIB copié', 'Fermer', {
        duration: 2000,
        panelClass: 'toast-succes'
      });
    } catch {
      this.snack.open('Impossible de copier', 'Fermer', { duration: 2500 });
    }
  }

  imageErreur(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
