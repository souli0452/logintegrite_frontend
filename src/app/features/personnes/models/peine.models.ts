export type TypePeine = 'PRISON' | 'AMENDE' | 'CONFISCATION' | 'RADIATION' | 'AUTRE';
export type NatureSanction = 'JUDICIAIRE' | 'ADMINISTRATIVE';

export interface PeineRequest {
  typePeine: TypePeine;
  natureSanction?: NatureSanction;
  duree?: string;
  montantAmende?: number;
  dateDecision?: string;
  dateExecution?: string;
  description?: string;
}

export interface PeineResponse {
  id: string;
  implicationFaitId: string;
  typePeine: TypePeine;
  natureSanction?: NatureSanction;
  duree?: string;
  montantAmende?: number;
  dateDecision?: string;
  dateExecution?: string;
  description?: string;
}
