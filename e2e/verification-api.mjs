// Droits du compte de consultation verifies cote SERVEUR (appels directs a l API, sans passer par l interface).
// Variables : UI_PASSWORD, REG_ID/REG_NUM (personne du registre officiel), INS_ID/INS_NUM (personne seulement en instruction).
// Attention : ce test epuise volontairement le plafond de 20 recherches par 10 minutes du compte consultant.
import { chromium } from 'playwright';
import net from 'net';
for (const port of [4200, 8180, 8080]) net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
const [REG_ID, REG_NUM, INS_ID, INS_NUM] = [process.env.REG_ID, process.env.REG_NUM, process.env.INS_ID, process.env.INS_NUM];
const nav = await chromium.launch();
let echecs = 0;
const ok = (n, v, d = '') => { if (!v) echecs++; console.log(v ? '[OK]   ' : '[ECHEC]', n, d); };

async function jeton(user) {
  const page = await (await nav.newContext()).newPage();
  let t = null;
  page.on('request', (r) => { const a = r.headers()['authorization']; if (a && r.url().includes('/api/v1/')) t = a; });
  await page.goto('http://localhost:4200'); await page.waitForURL(/8180.*auth/);
  await page.fill('#username', user); await page.fill('#password', process.env.UI_PASSWORD); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  for (let i = 0; i < 20 && !t; i++) await page.waitForTimeout(300);
  return t;
}
const api = (t) => async (methode, chemin, corps) => {
  const r = await fetch('http://localhost:8080/api/v1' + chemin, { method: methode, headers: { Authorization: t, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  let j = null; try { j = await r.json(); } catch { /* vide */ }
  return { s: r.status, j };
};

// ---------------- consultant
const cons = api(await jeton('consultant.test'));
console.log('== CONSULTANT : accès fermés par défaut');
for (const c of ['/personnes/en-instruction', '/personnes/registre-officiel', '/personnes/recherche?size=5', `/personnes/${INS_ID}`, `/personnes/${REG_ID}`, `/personnes/${REG_ID}/documents`, '/dossiers?size=5', '/audit/journal-audit', '/demandes-export']) {
  const r = await cons('GET', c); ok(`GET ${c.split('?')[0].replace(/[0-9a-f-]{36}/, '{id}')} refusé`, r.s === 403, `(${r.s})`);
}
console.log('== CONSULTANT : recherche précise');
let r = await cons('GET', '/verification/recherche'); ok('sans critère : 400', r.s === 400, `(${r.s})`);
r = await cons('GET', '/verification/recherche?nom=Ouedraogo'); ok('nom seul : 400', r.s === 400, `(${r.s})`);
r = await cons('GET', `/verification/recherche?numeroPersonne=${REG_NUM}`); ok('personne du registre trouvée par son numéro', r.s === 200 && r.j.length === 1 && r.j[0].id === REG_ID, `(${r.s}, ${r.j?.length} résultat)`);
r = await cons('GET', `/verification/recherche?numeroPersonne=${INS_NUM}`); ok("personne seulement en instruction : AUCUN résultat (existence non révélée)", r.s === 200 && r.j.length === 0, `(${r.s}, ${r.j?.length})`);
console.log('== CONSULTANT : fiche');
r = await cons('GET', `/verification/personnes/${REG_ID}`);
const f = r.j;
ok('fiche du registre : 200 avec dossiers', r.s === 200 && f.dossiers?.length > 0, `(${r.s}, ${f?.dossiers?.length} dossier(s))`);
const faits = (f?.dossiers ?? []).flatMap((d) => d.faits);
ok('fiche : faits avec statut judiciaire', faits.length > 0 && faits.every((x) => x.statutJudiciaire), `(${faits.length} fait(s))`);
const cles = JSON.stringify(f);
ok("fiche : aucun document, adresse, téléphone ni pièce d'identité", !/adresse|telephone|numeroPiece|nomOriginal|hashIntegrite|photo/i.test(cles));
r = await cons('GET', `/verification/personnes/${INS_ID}`); ok('fiche d’une personne en instruction : 404 (comme une inconnue)', r.s === 404, `(${r.s})`);
console.log('== CONSULTANT : export sur demande');
r = await cons('POST', `/verification/personnes/${REG_ID}/demande-export`, { motif: 'court' }); ok('motif trop court : 400', r.s === 400, `(${r.s})`);
r = await cons('POST', `/verification/personnes/${INS_ID}/demande-export`, { motif: 'Verification avant nomination au poste de comptable' }); ok('demande sur une personne non visible : 404', r.s === 404, `(${r.s})`);
r = await cons('POST', `/verification/personnes/${REG_ID}/demande-export`, { motif: 'Verification avant nomination au poste de comptable principal' }); ok('demande motivée : 201 en attente', r.s === 201 && r.j.statut === 'EN_ATTENTE', `(${r.s})`);
const idDemande = r.j?.id;
r = await cons('POST', `/verification/personnes/${REG_ID}/demande-export`, { motif: 'Verification avant nomination au poste de comptable principal' }); ok('deuxième demande identique : 409', r.s === 409, `(${r.s})`);
r = await cons('GET', '/verification/mes-demandes'); ok('mes demandes : 1 en attente', r.s === 200 && r.j.length >= 1, `(${r.s})`);
r = await cons('PUT', `/demandes-export/${idDemande}/decision`, { decision: 'ACCORDEE' }); ok("le consultant ne peut pas s'accorder sa demande : 403", r.s === 403, `(${r.s})`);
console.log('== CONSULTANT : limitation du débit');
let dernier = 0;
for (let i = 0; i < 25; i++) { const x = await cons('GET', `/verification/recherche?numeroPersonne=${REG_NUM}`); dernier = x.s; if (x.s === 429) break; }
ok('trop de recherches : 429', dernier === 429, `(${dernier})`);

// ---------------- administrateur
console.log('== ADMINISTRATEUR');
const adm = api(await jeton('admin.test'));
r = await adm('GET', '/demandes-export'); ok('liste des demandes', r.s === 200 && r.j.some((d) => d.id === idDemande), `(${r.s}, ${r.j?.length})`);
r = await adm('PUT', `/demandes-export/${idDemande}/decision`, { decision: 'REFUSEE' }); ok('refus sans raison : 400', r.s === 400, `(${r.s})`);
r = await adm('PUT', `/demandes-export/${idDemande}/decision`, { decision: 'ACCORDEE', commentaire: 'Transmis par courrier officiel' }); ok('accord : 200', r.s === 200 && r.j.statut === 'ACCORDEE', `(${r.s})`);
r = await adm('PUT', `/demandes-export/${idDemande}/decision`, { decision: 'REFUSEE', commentaire: 'Deja traite' }); ok('demande déjà traitée : 409', r.s === 409, `(${r.s})`);
r = await adm('GET', '/dossiers?size=1'); ok("l'administrateur garde l'accès aux dossiers", r.s === 200, `(${r.s})`);
r = await adm('GET', '/audit/evenements-poste?size=50'); ok('journal du poste : recherches et demandes tracées', r.s === 200 && r.j.content.some((e) => e.type === 'VERIFICATION_RECHERCHE') && r.j.content.some((e) => e.type === 'DEMANDE_EXPORT'), `(${r.s})`);

// ---------------- agent
console.log('== AGENT');
const ag = api(await jeton('agent.test'));
r = await ag('GET', '/dossiers?size=1'); ok("l'agent garde l'accès aux dossiers", r.s === 200, `(${r.s})`);
r = await ag('GET', '/personnes/en-instruction'); ok("l'agent garde l'accès aux personnes en instruction", r.s === 200, `(${r.s})`);
r = await ag('GET', `/verification/recherche?numeroPersonne=${REG_NUM}`); ok("l'agent peut aussi vérifier une personne", r.s === 200, `(${r.s})`);
r = await ag('GET', '/demandes-export'); ok("l'agent ne voit pas les demandes d'export : 403", r.s === 403, `(${r.s})`);

console.log(echecs === 0 ? '\nTOUT EST CONFORME' : `\n${echecs} ÉCHEC(S)`);
await nav.close(); process.exit(echecs ? 1 : 0);
