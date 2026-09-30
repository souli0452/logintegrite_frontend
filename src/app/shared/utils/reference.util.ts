/**
 * Reference courte affichee pour une personne (PERS-xxxxxx, ORG-xxxxxx).
 *
 * Les identifiants sont des UUID v7 : le DEBUT est l'horodatage (identique pour des fiches creees a la meme
 * seconde), la FIN est aleatoire. On utilise donc la fin pour que deux fiches aient des references differentes.
 * Cette reference est une aide de lecture ; l'identifiant complet reste la reference technique.
 */
export function referencePersonne(id: string, typePersonne: string): string {
  const prefixe = typePersonne === 'PHYSIQUE' ? 'PERS' : 'ORG';
  return `${prefixe}-${id.replace(/-/g, '').slice(-6).toUpperCase()}`;
}
