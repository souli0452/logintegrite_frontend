// Corrections vues par l'utilisateur : NIP affiche, modification d'un dossier, retrait d'une personne, cloture,
// boutons retires ou reserves. Variable : UI_PASSWORD. Les donnees sont creees par l'API (voir flow-corrections.mjs).
import { chromium } from 'playwright';
import net from 'net';

for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
}
const sortie = process.env.SORTIE ?? '/out';
const nav = await chromium.launch();
let echecs = 0;
const ok = (n, v, d = '') => { if (!v) echecs++; console.log(v ? '[OK]   ' : '[ECHEC]', n, d); };

async function session(user) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let t = null;
  page.on('request', (r) => { const a = r.headers()['authorization']; if (a && r.url().includes('/api/v1/')) t = a; });
  await page.goto('http://localhost:4200'); await page.waitForURL(/8180.*auth/);
  await page.fill('#username', user); await page.fill('#password', process.env.UI_PASSWORD); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  return { ctx, page, jeton: async () => { for (let i = 0; i < 30 && !t; i++) await page.waitForTimeout(300); return t; } };
}
const api = (t) => async (m, c, corps) => {
  const r = await fetch('http://localhost:8080/api/v1' + c, { method: m, headers: { Authorization: t, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  let j = null; try { j = await r.json(); } catch { /* vide */ }
  return { s: r.status, j };
};

const A = await session('agent.test');
await A.page.goto('http://localhost:4200/personnes'); await A.page.waitForTimeout(1500);
const agent = api(await A.jeton());
const V = await session('validateur.test'); await V.page.goto('http://localhost:4200/validation');
const validateur = api(await V.jeton());

const liste = async (c) => { const r = await agent('GET', c); return r.j?.content ?? r.j ?? []; };
const source = (await liste('/referentiels/sources-signalement'))[0].id;
const role = (await liste('/referentiels/roles-implication'))[0].id;
const infraction = (await liste('/referentiels/types-infraction'))[0].id;
const suffixe = Date.now().toString().slice(-8);
const NIP = 'U' + String(Math.floor(Math.random() * 1e16)).padStart(16, '0');

// une personne avec NIP et un dossier ouvert
const nom = 'IhmCorr' + suffixe;
let r = await agent('POST', '/personnes/physiques', { nomNaissance: nom, prenoms: 'Test', sexe: 'M', dateNaissance: '1981-02-03', nip: NIP });
const idPersonne = r.j.id;
r = await agent('POST', '/dossiers/ouverture', { personneExistanteId: idPersonne, dossier: { intitule: 'Dossier ' + nom, sourceSignalementId: source }, roleImplicationId: role,
  premierFait: { typeInfractionId: infraction, dateFaits: '2026-06-10', description: 'Fait de test', montantPrejudice: 1000000, devise: 'XOF' } });
const idDossier = r.j.dossierId ?? r.j.dossier?.id ?? r.j.id;

console.log('== NIP à l\'écran');
await A.page.goto(`http://localhost:4200/personnes/${idPersonne}`); await A.page.waitForTimeout(2500);
ok('le NIP saisi apparaît sur la fiche de la personne', (await A.page.locator('body').innerText()).includes(NIP));
await A.page.screenshot({ path: `${sortie}/corr-01-fiche-nip.png` });

console.log('== Dossier : modifier, retirer une personne, clôturer');
await A.page.goto(`http://localhost:4200/dossiers/${idDossier}`); await A.page.waitForTimeout(2500);
await A.page.getByRole('button', { name: /Actions/ }).first().click(); await A.page.waitForTimeout(400);
const menu = (await A.page.locator('.mat-mdc-menu-panel').innerText()).replace(/\s+/g, ' ');
ok('le menu Actions propose Modifier et Clôturer', /Modifier le dossier/.test(menu) && /Clôturer le dossier/.test(menu), menu);
ok('le menu Actions ne propose plus « Supprimer le dossier »', !/Supprimer/.test(menu));
await A.page.getByRole('menuitem', { name: /Modifier le dossier/ }).click(); await A.page.waitForTimeout(800);
await A.page.screenshot({ path: `${sortie}/corr-02-modifier.png` });
await A.page.fill('mat-dialog-container [formcontrolname=intitule]', 'Dossier renommé ' + nom);
await A.page.getByRole('button', { name: 'Enregistrer' }).click(); await A.page.waitForTimeout(1500);
ok('le dossier modifié affiche son nouvel intitulé', (await A.page.locator('body').innerText()).includes('Dossier renommé ' + nom));

// clôture refusée : un fait attend une validation, le message du serveur s'affiche
await A.page.getByRole('button', { name: /Actions/ }).first().click(); await A.page.waitForTimeout(300);
await A.page.getByRole('menuitem', { name: /Clôturer le dossier/ }).click(); await A.page.waitForTimeout(600);
await A.page.getByRole('button', { name: 'Clôturer', exact: true }).click(); await A.page.waitForTimeout(1500);
ok('clôture refusée : le motif du serveur est affiché', /attend encore une validation/.test(await A.page.locator('body').innerText()));

// retrait de la personne
await A.page.locator('button:has(.icone-danger)').first().click(); await A.page.waitForTimeout(600);
await A.page.getByRole('button', { name: 'Retirer', exact: true }).click(); await A.page.waitForTimeout(1500);
ok('la personne est retirée du dossier à l\'écran', (await A.page.locator('body').innerText()).includes('Personne retirée du dossier') || await A.page.locator('button:has(.icone-danger)').count() === 0);

// le validateur valide le fait, puis l'agent clôture
const faitId = (await agent('GET', `/dossiers/${idDossier}/faits`)).j[0].id;
await validateur('PUT', `/faits/${faitId}/valider`, {});
await A.page.goto(`http://localhost:4200/dossiers/${idDossier}`); await A.page.waitForTimeout(2500);
await A.page.getByRole('button', { name: /Actions/ }).first().click(); await A.page.waitForTimeout(300);
await A.page.getByRole('menuitem', { name: /Clôturer le dossier/ }).click(); await A.page.waitForTimeout(600);
await A.page.getByRole('button', { name: 'Clôturer', exact: true }).click(); await A.page.waitForTimeout(1800);
const corps = await A.page.locator('body').innerText();
ok('le dossier est clôturé à l\'écran', /Dossier clôturé/.test(corps) || /Clôturé/i.test(corps));
await A.page.screenshot({ path: `${sortie}/corr-03-cloture.png` });
await A.page.getByRole('button', { name: /Actions/ }).first().click().catch(() => {}); await A.page.waitForTimeout(300);
const menu2 = (await A.page.locator('.mat-mdc-menu-panel').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok('un dossier clôturé ne propose plus de clôture', !/Clôturer le dossier/.test(menu2), menu2);

console.log('== Suppression d\'une personne : réservée à l\'administrateur');
await A.page.keyboard.press('Escape');
await A.page.goto('http://localhost:4200/personnes'); await A.page.waitForTimeout(2000);
ok('l\'agent ne voit pas la corbeille dans la liste des personnes', await A.page.locator('button[title="Supprimer"]').count() === 0);
const D = await session('admin.test');
await D.page.goto('http://localhost:4200/personnes'); await D.page.waitForTimeout(2000);
ok('l\'administrateur voit la corbeille', await D.page.locator('button[title="Supprimer"]').count() > 0);

console.log(echecs === 0 ? '\nTOUT EST CONFORME' : `\n${echecs} ECHEC(S)`);
await nav.close(); process.exit(echecs ? 1 : 0);
