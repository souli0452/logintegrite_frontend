export type CodeRole = 'ADMIN' | 'AGENT' | 'VALIDATEUR' | 'CONSULTANT';

export interface RoleHabilitationResponse {
  id: string;
  code: CodeRole;
  libelle: string;
  accesVueGlobaleDossier: boolean;
}

export interface UtilisateurResponse {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  roles: RoleHabilitationResponse[];
}

export interface UtilisateurCreationRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  motDePasseTemporaire: string;
  roleInitial: CodeRole;
}
