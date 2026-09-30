export type StatutDossier = 'OUVERT' | 'CLOTURE';
export type StatutValidationFait = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

// ---- Dossier ----

export interface DossierRequest {
  intitule?: string;
  sourceSignalementId: string;
  descriptionContexte?: string;
  dateOuverture: string;
}

export interface DossierResponse {
  id: string;
  numeroDossier?: string;
  intitule?: string;
  sourceSignalementId: string;
  sourceSignalementLibelle: string;
  statutDossier: StatutDossier;
  dateOuverture: string;
  dateCloture?: string;
  descriptionContexte?: string;
}

// ---- Implication (personne dans un dossier) ----

export interface ImplicationRequest {
  personneId: string;
  roleImplicationId: string;
  entiteOrganisationId?: string;
  entiteLibelleALEpoque?: string;
  fonctionOccupee?: string;
  dateDebut: string;
  dateFin?: string;
  observations?: string;
}

export interface ImplicationResponse {
  id: string;
  dossierId: string;
  personneId: string;
  personneNomAffichage: string;
  roleImplicationId: string;
  roleImplicationLibelle: string;
  entiteOrganisationId?: string;
  entiteOrganisationLibelle?: string;
  entiteLibelleALEpoque?: string;
  fonctionOccupee?: string;
  dateDebut: string;
  dateFin?: string;
  observations?: string;
   statutJudiciaireId?: string;
  statutJudiciaireLibelle?: string;
  autoriteCompetente?: string;
  referenceAffaire?: string;
}

// ---- Fait reproche ----

export interface FaitReprocheRequest {
  typeInfractionId: string;
  zoneGeographiqueId?: string;
  dateFaits: string;
  lieuPrecis?: string;
  description: string;
  montantPrejudice: number;
  devise: string;
}

export interface FaitReprocheResponse {
  id: string;
  dossierId: string;
  typeInfractionId: string;
  typeInfractionLibelle: string;
  zoneGeographiqueId?: string;
  zoneGeographiqueLibelle?: string;
  dateFaits: string;
  lieuPrecis?: string;
  description: string;
  montantPrejudice: number;
  devise: string;
  statutValidation: StatutValidationFait;
  motifRejet?: string;
  dateValidation?: string;
}

// ---- Pagination Spring Boot ----

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// Structure agregee pour l'ecran validation :
// un dossier + les infos de la personne principale + les faits EN_ATTENTE
export interface DossierAValiderResponse {
  dossierId: string;
  numeroDossier: string | null;
  intitule: string | null;
  dateOuverture: string;
  sourceSignalementLibelle: string | null;

  personneId: string | null;
  personneNomAffichage: string | null;
  personneTypePersonne: 'PHYSIQUE' | 'MORALE' | null;
  personneRoleImplication: string | null;

  faitsEnAttente: FaitReprocheResponse[];
  nombreFaitsEnAttente: number;
}

// Structure enrichie pour l'ecran "Faits rejetes" :
// un fait rejete + son dossier + la personne principale + le motif
export interface FaitRejeteResponse {
  id: string;

  // Contexte dossier
  dossierId: string;
  numeroDossier?: string;
  intitule?: string;

  // Contexte personne (via la premiere implication)
  personneId?: string;
  personneNomAffichage?: string;
  personneTypePersonne?: 'PHYSIQUE' | 'MORALE';

  // Fait
  typeInfractionLibelle: string;
  dateFaits: string;
  description: string;
  montantPrejudice?: number;
  devise?: string;

  // Info du rejet
  motifRejet: string;
  dateRejet: string;
  rejeteParNomComplet?: string;
}

export interface MiseAJourStatutJudiciaireRequest {
  statutJudiciaireId: string;
  dateStatut: string;                // format 'yyyy-MM-dd'
  autoriteCompetente?: string;
  referenceAffaire?: string;
  motif?: string;
}
