export interface ResultatVerification {
  id: string;
  numeroPersonne: string;
  nomAffichage: string;
  typePersonne: 'PHYSIQUE' | 'MORALE' | string;
  dateNaissance: string | null;
  nationalite: string | null;
  nombreDossiers: number;
}

export interface PeineVerification {
  typePeine: string | null;
  natureSanction: string | null;
  duree: string | null;
  montantAmende: number | null;
  dateDecision: string | null;
  description: string | null;
}

export interface FaitVerification {
  id: string;
  typeInfraction: string;
  categorie: string | null;
  dateFaits: string;
  lieu: string | null;
  description: string | null;
  montantPrejudice: number | null;
  devise: string | null;
  montantConfirmeJustice: number | null;
  statutJudiciaire: string;
  dateStatut: string | null;
  issueFavorable: boolean;
  peines: PeineVerification[];
}

export interface DossierVerification {
  id: string;
  numeroDossier: string;
  intitule: string;
  dateOuverture: string;
  statutDossier: string;
  role: string;
  fonction: string | null;
  entite: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  faits: FaitVerification[];
}

export interface FicheVerification {
  id: string;
  numeroPersonne: string;
  nomAffichage: string;
  typePersonne: 'PHYSIQUE' | 'MORALE' | string;
  dateNaissance: string | null;
  nationalite: string | null;
  profession: string | null;
  formeJuridique: string | null;
  sigle: string | null;
  dossiers: DossierVerification[];
}

export type StatutDemande = 'EN_ATTENTE' | 'ACCORDEE' | 'REFUSEE';

export interface DemandeExport {
  id: string;
  dateDemande: string;
  personneId: string;
  personne: string;
  demandeur: string;
  motif: string;
  statut: StatutDemande;
  traitePar: string | null;
  dateTraitement: string | null;
  commentaire: string | null;
}

export interface CriteresVerification {
  numeroPiece?: string;
  rccm?: string;
  ifu?: string;
  numeroPersonne?: string;
  nom?: string;
  prenoms?: string;
  dateNaissance?: string;
}
