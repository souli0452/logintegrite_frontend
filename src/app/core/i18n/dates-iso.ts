/** Date locale -> AAAA-MM-JJ (sans decalage de fuseau, contrairement a toISOString). */
export function versIso(d: Date | null | undefined): string {
  if (!d) return '';
  const deuxChiffres = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/** AAAA-MM-JJ -> date locale (minuit), ou null. */
export function depuisIso(s: string | null | undefined): Date | null {
  const m = s ? /^(\d{4})-(\d{2})-(\d{2})/.exec(s) : null;
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
