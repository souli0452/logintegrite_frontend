// Verifie les corrections de comportement (NIP, cloture, modification, retrait d'une personne d'un dossier) cote SERVEUR,
// avec les vrais profils : agent, validateur, administrateur, consultant. Variable : UI_PASSWORD.
import { chromium } from 'playwright';
import net from 'net';

for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
}
const nav = await chromium.launch();
let echecs = 0;
const ok = (n, v, d = '') => { if (!v) echecs++; console.log(v ? '[OK]   ' : '[ECHEC]', n, d); };

async function jeton(user, pageDeDepart) {
  const page = await (await nav.newContext()).newPage();
  let t = null;
  page.on('request', (r) => { const a = r.headers()['authorization']; if (a && r.url().includes('/api/v1/')) t = a; });
  await page.goto('http://localhost:4200'); await page.waitForURL(/8180.*auth/);
  await page.fill('#username', user); await page.fill('#password', process.env.UI_PASSWORD); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  await page.goto('http://localhost:4200' + pageDeDepart).catch(() => {});
  for (let i = 0; i < 30 && !t; i++) await page.waitForTimeout(300);
  return t;
}
const api = (t) => async (methode, chemin, corps) => {
  const r = await fetch('http://localhost:8080/api/v1' + chemin, { method: methode, headers: { Authorization: t, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  let j = null; try { j = await r.json(); } catch { /* vide */ }
  return { s: r.status, j };
};

const agent = api(await jeton('agent.test', '/personnes'));
const validateur = api(await jeton('validateur.test', '/validation'));
const admin = api(await jeton('admin.test', '/administration'));
const consultant = api(await jeton('consultant.test', '/verification/mes-demandes'));

const liste = async (chemin) => { const r = await agent('GET', chemin); return r.j?.content ?? r.j ?? []; };
const source = (await liste('/referentiels/sources-signalement'))[0].id;
const role = (await liste('/referentiels/roles-implication'))[0].id;
const infraction = (await liste('/referentiels/types-infraction'))[0].id;

const suffixe = Date.now().toString().slice(-8);
const chiffres = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
const NIP = 'T' + chiffres(16);
const personne = (nom, nip) => ({ nomNaissance: nom, prenoms: 'Correction', sexe: 'M', dateNaissance: '1980-04-12', nip });
const dossier = (nom) => ({ intitule: 'Dossier ' + nom, sourceSignalementId: source, descriptionContexte: 'test des corrections' });
const fait = () => ({ typeInfractionId: infraction, dateFaits: '2026-06-10', description: 'Fait de test', montantPrejudice: 1000000, devise: 'XOF' });
const ouvrir = (personneId, nom) => agent('POST', '/dossiers/ouverture', { personneExistanteId: personneId, dossier: dossier(nom), roleImplicationId: role, premierFait: fait() });

console.log('== NIP');
const nomA = 'NipA' + suffixe;
let r = await agent('POST', '/personnes/physiques', personne(nomA, ' ' + NIP.toLowerCase().replace(/^(.{4})/, '$1 ') + ' '));
const idA = r.j?.id;
ok('création avec un NIP saisi en minuscules et avec espaces : enregistré normalisé', r.s === 201 && r.j.nip === NIP, `(${r.s} ${r.j?.nip})`);
r = await agent('GET', `/personnes/physiques/${idA}`);
ok('le NIP est conservé et relu', r.s === 200 && r.j.nip === NIP, `(${r.s})`);
r = await agent('POST', '/personnes/physiques', personne('NipB' + suffixe, NIP));
ok('même NIP pour une autre personne : refusé (409) en nommant la personne', r.s === 409 && JSON.stringify(r.j).includes('PERS-'), `(${r.s})`);
r = await agent('POST', '/personnes/physiques', personne('NipC' + suffixe, '123'));
ok('NIP trop court : refusé (400)', r.s === 400, `(${r.s})`);
r = await agent('GET', `/personnes/physiques/verifier-nip?nip=${NIP}`);
ok('contrôle en direct : NIP déjà pris, avec la personne désignée', r.s === 200 && r.j.disponible === false && r.j.personneExistanteId === idA, `(${r.s})`);
r = await agent('GET', `/personnes/physiques/verifier-nip?nip=${NIP}&exclureId=${idA}`);
ok('contrôle en direct : la personne modifiée ne se bloque pas elle-même', r.s === 200 && r.j.disponible === true, `(${r.s})`);
r = await agent('GET', `/personnes/physiques/verifier-nip?nip=T${chiffres(16)}`);
ok('contrôle en direct : un autre NIP est libre', r.s === 200 && r.j.disponible === true, `(${r.s})`);
r = await agent('GET', `/personnes/recherche?numeroPieceIdentite=${NIP}`);
ok('recherche avancée par numéro d\'identification : retrouve la personne par son NIP', r.s === 200 && (r.j.content ?? []).some((p) => p.id === idA), `(${r.s} ${r.j?.totalElements})`);

console.log('== Clôture et modification d\'un dossier');
r = await ouvrir(idA, nomA);
const dossierId = r.j?.dossierId ?? r.j?.dossier?.id ?? r.j?.id;
ok('ouverture d\'un dossier pour cette personne', r.s === 201 && !!dossierId, `(${r.s})`);
const faitId = (await agent('GET', `/dossiers/${dossierId}/faits`)).j?.[0]?.id;
r = await agent('PATCH', `/dossiers/${dossierId}/cloturer`);
ok('clôture refusée tant qu\'un fait attend une validation (409)', r.s === 409 && /attend/.test(JSON.stringify(r.j)), `(${r.s})`);
r = await agent('PUT', `/dossiers/${dossierId}`, { ...dossier(nomA), intitule: 'Dossier modifié ' + nomA, dateOuverture: '2026-10-01' });
ok('modification du dossier ouvert : 200', r.s === 200 && r.j.intitule === 'Dossier modifié ' + nomA, `(${r.s})`);
r = await validateur('PUT', `/faits/${faitId}/valider`, {});
ok('le validateur valide le fait', r.s === 200, `(${r.s})`);
r = await consultant('PATCH', `/dossiers/${dossierId}/cloturer`);
ok('un consultant ne peut pas clôturer (403)', r.s === 403, `(${r.s})`);
r = await validateur('PATCH', `/dossiers/${dossierId}/cloturer`);
ok('un validateur ne peut pas clôturer (403)', r.s === 403, `(${r.s})`);
r = await agent('PATCH', `/dossiers/${dossierId}/cloturer`);
ok('clôture une fois tous les faits traités : 200, statut CLOTURE et date', r.s === 200 && r.j.statutDossier === 'CLOTURE' && !!r.j.dateCloture, `(${r.s} ${r.j?.statutDossier})`);
r = await agent('PATCH', `/dossiers/${dossierId}/cloturer`);
ok('clôturer deux fois : refusé (409)', r.s === 409, `(${r.s})`);
r = await agent('PUT', `/dossiers/${dossierId}`, { ...dossier(nomA), dateOuverture: '2026-10-01' });
ok('dossier clôturé : modification refusée (409)', r.s === 409, `(${r.s})`);
r = await agent('POST', `/dossiers/${dossierId}/faits`, fait());
ok('dossier clôturé : nouveau fait refusé (409)', r.s === 409, `(${r.s})`);

console.log('== Vérification par NIP (consultation)');
r = await consultant('GET', `/verification/recherche?numeroPiece=${NIP}`);
ok('le consultant retrouve la personne du registre par son NIP', r.s === 200 && r.j.length === 1 && r.j[0].id === idA, `(${r.s} ${r.j?.length})`);
r = await consultant('GET', `/verification/personnes/${idA}`);
ok('la fiche de consultation ne montre pas le NIP', r.s === 200 && !JSON.stringify(r.j).includes(NIP), `(${r.s})`);

console.log('== Retrait d\'une personne d\'un dossier');
const nomD = 'Retrait' + suffixe;
r = await agent('POST', '/personnes/physiques', personne(nomD));
const idD = r.j?.id;
r = await ouvrir(idD, nomD);
const dossierD = r.j?.dossierId ?? r.j?.dossier?.id ?? r.j?.id;
let impl = (await agent('GET', `/dossiers/${dossierD}/implications`)).j ?? [];
ok('le dossier contient la personne', impl.length === 1, `(${impl.length})`);
r = await validateur('DELETE', `/dossiers/${dossierD}/implications/${impl[0]?.id}`);
ok('un validateur ne peut pas retirer une personne (403)', r.s === 403, `(${r.s})`);
r = await agent('DELETE', `/dossiers/${dossierD}/implications/${impl[0]?.id}`);
ok('l\'agent retire la personne (fait non validé) : 204', r.s === 204, `(${r.s})`);
impl = (await agent('GET', `/dossiers/${dossierD}/implications`)).j ?? [];
ok('le dossier ne contient plus la personne', impl.length === 0, `(${impl.length})`);

const nomE = 'Valide' + suffixe;
r = await agent('POST', '/personnes/physiques', personne(nomE));
const idE = r.j?.id;
r = await ouvrir(idE, nomE);
const dossierE = r.j?.dossierId ?? r.j?.dossier?.id ?? r.j?.id;
const faitE = (await agent('GET', `/dossiers/${dossierE}/faits`)).j?.[0]?.id;
await validateur('PUT', `/faits/${faitE}/valider`, {});
impl = (await agent('GET', `/dossiers/${dossierE}/implications`)).j ?? [];
r = await agent('DELETE', `/dossiers/${dossierE}/implications/${impl[0]?.id}`);
ok('une personne liée à un fait validé ne peut plus être retirée (409)', r.s === 409, `(${r.s})`);
r = await agent('DELETE', `/dossiers/${dossierD}/implications/${impl[0]?.id}`);
ok('une implication d\'un autre dossier est introuvable (404)', r.s === 404, `(${r.s})`);

console.log(echecs === 0 ? '\nTOUT EST CONFORME' : `\n${echecs} ECHEC(S)`);
await nav.close(); process.exit(echecs ? 1 : 0);
