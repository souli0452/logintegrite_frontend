export interface EtatTrimestrielResume {
  id: string;
  annee: number;
  trimestre: number;
  dateArret: string;       // AAAA-MM-JJ
  dateGeneration: string;  // instant ISO
  generePar: string;
  nbPersonnes: number;
  sha256Pdf: string;
  sha256Excel: string;
  remplace: boolean;
}

export interface TrimestreOption {
  annee: number;
  trimestre: number;
  libelle: string;
}
