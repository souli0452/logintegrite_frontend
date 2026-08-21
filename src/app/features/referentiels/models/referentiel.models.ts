export interface CategorieInfractionResponse {
  id: string;
  libelle: string;
  description?: string;
}

export interface CategorieInfractionRequest {
  libelle: string;
  description?: string;
}

// Ajouter apres CategorieInfractionRequest (a la fin du fichier)

export interface SourceSignalementResponse {
  id: string;
  libelle: string;
}

export interface RoleImplicationResponse {
  id: string;
  libelle: string;
  actif: boolean;
}

export interface TypeInfractionResponse {
  id: string;
  libelle: string;
  actif: boolean;
  categorieInfractionId: string;
  categorieInfractionLibelle: string;
}

export interface ZoneGeographiqueResponse {
  id: string;
  libelle: string;
  niveau: 'PAYS' | 'REGION' | 'PROVINCE' | 'COMMUNE';
  parentId?: string;
}

export interface StatutJudiciaireResponse {
  id: string;
  libelle: string;
  actif: boolean;
}

export interface EntiteOrganisationResponse {
  id: string;
  libelle: string;
  niveau: 'MINISTERE' | 'DIRECTION' | 'SERVICE';
  parentId?: string;
  parentLibelle?: string;
}

// Interface commune pour les referentiels simples (libelle + actif)
export interface ReferentielSimpleResponse {
  id: string;
  libelle: string;
  actif: boolean;
}

export interface ReferentielSimpleRequest {
  libelle: string;
  actif: boolean;
}

// Sources de signalement et Types de document n'ont pas de champ 'actif' -
// on les traite comme des libelles purs
export interface ReferentielLibelleResponse {
  id: string;
  libelle: string;
}

export interface ReferentielLibelleRequest {
  libelle: string;
}

export interface TypeDocumentResponse {
  id: string;
  libelle: string;
}


// ─── Nationalité (référentiel simple avec code ISO) ─────────────────────────
export interface NationaliteResponse extends ReferentielSimpleResponse {
  codeIso?: string;
}

export interface NationaliteRequest extends ReferentielSimpleRequest {
  codeIso?: string;
}

// ─── Type de pièce d'identité (référentiel avec code immuable) ──────────────
export interface TypePieceIdentiteResponse extends ReferentielSimpleResponse {
  code: string;   // immuable : CNIB, PASSEPORT, PERMIS...
}

export interface TypePieceIdentiteRequest extends ReferentielSimpleRequest {
  code: string;
}
