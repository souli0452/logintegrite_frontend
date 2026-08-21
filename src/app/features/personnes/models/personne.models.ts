export type TypePieceIdentite = 'CNIB' | 'PASSEPORT' | 'NIF'; // CONSERVÉ pour rétrocompatibilité

export type TypePersonne = 'PHYSIQUE' | 'MORALE';
export type Sexe = 'M' | 'F';
export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
export type StatutPersonneMorale = 'ACTIVE' | 'DISSOUTE' | 'RADIEE' | 'EN_LIQUIDATION';

// Ré-export pour compatibilité descendante (en utilisant 'export type')
export type { PeineRequest, PeineResponse, TypePeine, NatureSanction } from './peine.models';

// Réponse minimale servie par /personnes (vue polymorphe)
export interface PersonneResumeResponse {
  id: string;
  typePersonne: 'PHYSIQUE' | 'MORALE';
  nomAffichage: string;
  statutAncrage: 'EN_INSTRUCTION' | 'REGISTRE_OFFICIEL';
  nombreDossiersValides: number;
  dateCreation: string;
}

// ---- Personne Physique ----

export interface PersonnePhysiqueRequest {
  nomNaissance: string;
  nomUsage?: string;
  prenoms: string;
  sexe: 'M' | 'F';
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  nationaliteId?: string;
  situationMatrimoniale?: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
  nomConjoint?: string;
  profession?: string;
  matriculeFonctionPublique?: string;
  gradeCategorie?: string;
  adresse?: string;
  telephone?: string;
  nip?: string;
}

export interface PersonnePhysiqueResponse {
  id: string;
  nomAffichage: string;
  nomNaissance: string;
  nomUsage?: string;
  prenoms: string;
  sexe: 'M' | 'F';
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  nationaliteId?: string;
  nationaliteLibelle?: string;
  situationMatrimoniale?: string;
  nomConjoint?: string;
  profession?: string;
  matriculeFonctionPublique?: string;
  gradeCategorie?: string;
  adresse?: string;
  telephone?: string;
  aUnePhoto: boolean;
  nip?: string;
  alias?: AliasResponse[];               // Ajouté pour l'onglet aperçu
  piecesIdentite?: PieceIdentiteResponse[]; // Ajouté pour l'onglet aperçu
}

// ---- Personne Morale ----

export interface PersonneMoraleRequest {
  denominationSociale: string;
  sigle?: string;
  formeJuridique: string;
  rccm?: string;
  ifu?: string;
  secteurActivite: string;
  siegeSocial: string;
  capitalSocial?: number;
  dateCreationEntreprise?: string;
  telephone?: string;
  email?: string;
  statut?: StatutPersonneMorale;
  representantLegalId?: string;
}

export interface PersonneMoraleResponse extends Omit<PersonneMoraleRequest, never> {
  id: string;
  nomAffichage: string;
  representantLegalNomComplet?: string;
  aUnLogo: boolean;
  alias?: AliasResponse[];               // Ajouté pour l'onglet aperçu
}

// ---- Entités liées pour les onglets du détail ----

export interface ImplicationResponse {
  id: string;
  dossierId: string;
  personneId: string;
  personneNomAffichage: string;
  roleImplicationId: string;
  roleImplicationLibelle: string;
  entiteOrganisationId?: string;
  entiteOrganisationLibelle?: string;
  fonctionOccupee?: string;
  dateDebut: string;
  dateFin?: string;
  observations?: string;
}

export interface FaitReprocheResponse {
  id: string;
  dossierId: string;
  typeInfractionId: string;
  typeInfractionLibelle: string;
  dateFaits: string;
  description: string;
  montantPrejudice: number;
  devise: string;
  statutValidation: 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';
}

export interface DossierResponse {
  id: string;
  numeroDossier?: string;
  intitule?: string;
  statutDossier: 'OUVERT' | 'CLOTURE';
  dateOuverture: string;
}

export interface DocumentResponse {
  id: string;
  dossierId: string;
  typeDocumentLibelle: string;
  nomOriginal: string;
  tailleOctets: number;
  hashIntegrite: string;
  dateUpload: string;
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

// ---- Alias (commun physique/morale) ----

export interface AliasRequest {
  nomAlias: string;
  commentaire?: string;
}

export interface AliasResponse {
  id: string;
  nomAlias: string;
  commentaire?: string;
  dateCreation?: string;
}

// ---- Piece d'identite (personne physique uniquement) ----

export interface PieceIdentiteRequest {
  typePiece?: TypePieceIdentite; // CONSERVÉ (optionnel pour rétrocompatibilité)
  typePieceId?: string;           // Canal moderne (UUID du référentiel)
  numero: string;
  dateDelivrance?: string;
  dateExpiration?: string;
}

export interface PieceIdentiteResponse {
  id: string;
  typePiece?: TypePieceIdentite; // CONSERVÉ
  typePieceId?: string;           // Nouveaux champs référentiels
  typePieceCode?: string;
  typePieceLibelle?: string;
  numero: string;
  dateDelivrance?: string;
  dateExpiration?: string;
}

export interface PersonneDocumentResponse {
  id: string;
  dossierId: string;
  numeroDossier: string;
  intituleDossier: string;
  typeDocumentId: string;
  typeDocumentLibelle: string;
  nomOriginal: string;
  tailleOctets: number;
  typeMime: string;
  hashIntegrite: string;
  dateUpload: string;
}

export interface ImplicationFaitResume {
  id: string;
  implicationId: string;
  faitReprocheId: string;
  dossierId: string;
  personneId: string;
  numeroDossier?: string;
  intituleDossier?: string;
  typeInfractionLibelle?: string;
  faitDescription: string;
  faitDateFaits?: string;
  statutValidation?: 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';
}

export interface VerificationNipResponse {
  disponible: boolean;
  personneExistanteId?: string;
  personneExistanteNomAffichage?: string;
  personneExistanteType?: 'PHYSIQUE' | 'MORALE';
}
