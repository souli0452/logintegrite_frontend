export interface PointEvolution {
  annee: number;
  valeur: number;
}

export interface RepartitionItem {
  libelle: string;
  valeur: number;
  pourcentage: number;
}

export interface TopStructureItem {
  rang: number;
  libelle: string;
  nombre: number;
}

export interface ActiviteRecenteItem {
  type: string;
  description: string;
  dateAction: string;
}

export interface DashboardExecutifResponse {
  totalDossiers: number;
  totalDossiersValides: number;
  totalDossiersEnAttente: number;
  totalDossiersRejetes: number;
  totalPersonnesImpliquees: number;

  deltaDossiers: number | null;
  deltaValides: number | null;
  deltaEnAttente: number | null;
  deltaRejetes: number | null;
  deltaPersonnes: number | null;

  evolutionDossiers: PointEvolution[];
  parCategorieInfraction: RepartitionItem[];
  parRegion: RepartitionItem[];
  parStatutDossier: RepartitionItem[];
  topStructures: TopStructureItem[];

  delaiMoyenValidationJours: number;
  tauxCompletudeGlobal: number;

  activitesRecentes: ActiviteRecenteItem[];
}
