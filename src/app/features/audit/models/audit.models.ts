import { PageResponse } from '../../personnes/models/personne.models';

// Reexport pour reutilisation
export type { PageResponse };

// ============================================================================
// MODÈLES EXISTANTS (conservés)
// ============================================================================

export interface JournalAuditResponse {
  id: string;
  action: string;
  entiteCible: string;         // "Personne", "Dossier", "FaitReproche"...
  entiteCibleId: string;
  valeurAvant?: unknown;       // JSON serialise cote backend
  valeurApres?: unknown;
  hashPrecedent?: string;
  hashActuel: string;
  dateAction: string;          // ISO instant
  adresseIp?: string;
  utilisateurId: string;
  utilisateurNomComplet?: string;
}

export interface JournalConsultationResponse {
  id: string;
  entiteConsultee: string;     // "Personne", "Dossier"...
  entiteConsulteeId: string;
  dateConsultation: string;    // ISO instant
  adresseIp?: string;
  utilisateurId: string;
  utilisateurNomComplet?: string;
}

// ============================================================================
// NOUVEAUX MODÈLES FORENSIQUES (Vague 1)
// ============================================================================

/**
 * État de la chaîne d'audit — alimente le bandeau haut d'écran.
 * Aucune vérification cryptographique n'est déclenchée par ce call.
 */
export interface EtatChaineResponse {
  totalEntrees: number;
  dernierHash: string | null;
  dateDerniereAction: string | null;
  datePremiereAction: string | null;
  totalUtilisateurs: number;
  totalEntites: number;
}

/**
 * Résultat d'une vérification cryptographique complète de la chaîne.
 * Une chaîne est intègre si `maillonsRompus` est vide.
 */
export interface VerificationChaineResponse {
  chaineIntegre: boolean;
  maillonsVerifies: number;
  nombreRuptures: number;
  dateVerification: string;
  dureeMillisecondes: number;
  maillonsRompus: MaillonRompu[];
}

export interface MaillonRompu {
  id: string;
  dateAction: string;
  action: string;
  entiteCible: string;
  hashAttendu: string;
  hashStocke: string;
  hashPrecedent: string;
  hashPrecedentAttendu: string;
  typeRupture: 'HASH_LIGNE' | 'CHAINAGE' | 'LES_DEUX';
}

/**
 * Vérification d'un maillon isolé identifié par son hash.
 */
export interface VerificationMaillonResponse {
  id: string;
  dateAction: string;
  action: string;
  entiteCible: string;
  hashStocke: string;
  hashRecalcule: string;
  hashPrecedent: string;
  integre: boolean;
  positionDansChaine: number;
}

/**
 * KPI forensiques du haut d'écran — 4 cartes.
 */
export interface KpiForensiqueResponse {
  // Carte 1 : Actions du jour
  actionsAujourdhuiTotal: number;
  actionsAujourdhuiCreation: number;
  actionsAujourdhuiModification: number;
  actionsAujourdhuiSuppression: number;
  deltaActionsVsHier: number;

  // Carte 2 : Consultations
  consultations24h: number;
  consultations24hPrecedentes: number;
  deltaConsultationsPct: number | null;

  // Carte 3 : Utilisateurs actifs
  utilisateursActifs24h: number;
  utilisateursActifs7j: number;

  // Carte 4 : Alertes de sécurité
  alertesOuvertes: number;
  actionsHorsHoraire24h: number;
  ipsMultiples24h: number;
}

export interface EvenementConnexion {
  date: string;
  type: string;
  utilisateur: string;
  adresseIp: string | null;
  motif: string | null;
  session: string | null;
}

export interface EvenementSecurite {
  id: string;
  date: string;
  type: string;
  utilisateur: string;
  page: string | null;
  detail: string | null;
  adresseIp: string | null;
  userAgent: string | null;
}
