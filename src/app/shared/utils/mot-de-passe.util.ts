import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Politique de mot de passe : identique a celle du serveur et du realm Keycloak de production. */
export const MOT_DE_PASSE_LONGUEUR_MIN = 12;
export const MOT_DE_PASSE_CONSIGNE =
  `Au moins ${MOT_DE_PASSE_LONGUEUR_MIN} caractères, avec une majuscule, une minuscule et un chiffre`;

/** Renvoie les regles non respectees ; liste vide = mot de passe conforme. */
export function reglesMotDePasseManquantes(mdp: string): string[] {
  const manquantes: string[] = [];
  if (mdp.length < MOT_DE_PASSE_LONGUEUR_MIN) manquantes.push('longueur');
  if (!/[a-z]/.test(mdp)) manquantes.push('minuscule');
  if (!/[A-Z]/.test(mdp)) manquantes.push('majuscule');
  if (!/\d/.test(mdp)) manquantes.push('chiffre');
  return manquantes;
}

/** Validateur de formulaire : ne signale rien si le champ est vide (c'est Validators.required qui s'en charge). */
export function validerMotDePasse(controle: AbstractControl): ValidationErrors | null {
  const valeur = String(controle.value ?? '');
  if (!valeur) return null;
  const manquantes = reglesMotDePasseManquantes(valeur);
  return manquantes.length ? { motDePasse: manquantes } : null;
}

const MINUSCULES = 'abcdefghjkmnpqrstuvwxyz';
const MAJUSCULES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHIFFRES = '23456789';
const SPECIAUX = '!@#$%*-_';

/** Entier uniforme dans [0, max[ tire du generateur cryptographique du navigateur (pas de Math.random). */
function entierAleatoire(max: number): number {
  const limite = Math.floor(0x100000000 / max) * max; // ecarte les valeurs qui biaiseraient le tirage
  const tirage = new Uint32Array(1);
  do {
    crypto.getRandomValues(tirage);
  } while (tirage[0] >= limite);
  return tirage[0] % max;
}

const piocher = (alphabet: string): string => alphabet[entierAleatoire(alphabet.length)];

/** Mot de passe aleatoire conforme a la politique (au moins un caractere de chaque famille). */
export function genererMotDePasseSecurise(longueur = 16): string {
  const taille = Math.max(longueur, MOT_DE_PASSE_LONGUEUR_MIN);
  const tous = MINUSCULES + MAJUSCULES + CHIFFRES + SPECIAUX;
  const caracteres = [piocher(MINUSCULES), piocher(MAJUSCULES), piocher(CHIFFRES), piocher(SPECIAUX)];
  while (caracteres.length < taille) caracteres.push(piocher(tous));
  // melange de Fisher-Yates pour que les caracteres imposes ne soient pas toujours au debut
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = entierAleatoire(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
