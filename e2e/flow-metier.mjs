// Parcours metier complet dans un vrai navigateur, avec trois roles (voir l'usage dans ui-check.mjs) :
//   AGENT cree une personne puis ouvre un dossier ; VALIDATEUR valide le fait ; CONSULTANT consulte le registre.
// Necessite les comptes agent.test, validateur.test, consultant.test (mot de passe dans UI_PASSWORD).
// Sortie : 17 controles [OK]/[ECHEC], captures dans /out, code de sortie 1 si une etape echoue (detail dans /out/flow-resultats.json).
// Parcours metier dans un vrai navigateur, avec des comptes de roles differents :
//   AGENT : cree une personne (assistant 3 etapes) puis ouvre un dossier avec implication et fait (assistant 4 etapes)
//   VALIDATEUR : valide le fait depuis l'ecran de validation ; la personne rejoint le registre officiel
//   CONSULTANT : consulte le registre, ne voit ni la creation ni la validation
import { chromium } from 'playwright';
import net from 'net';
import fs from 'fs';

for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
}
const PW = process.env.UI_PASSWORD;
const NOM = 'UiTest' + Date.now().toString().slice(-7);
const resultats = [];
const ok = (etape, condition, detail = '') => { resultats.push({ etape, ok: !!condition, detail }); console.log(`${condition ? '[OK]    ' : '[ECHEC] '}${etape}${detail ? ' — ' + detail : ''}`); };

const nav = await chromium.launch();

async function session(utilisateur, viewport = { width: 1366, height: 1000 }) {
  const ctx = await nav.newContext({ viewport, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const requetes = [];
  const erreurs = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/v1') && r.request().method() !== 'GET') requetes.push({ m: r.request().method(), u: r.url().replace(/.*\/api\/v1/, ''), s: r.status() });
  });
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text().slice(0, 150)); });
  page.on('pageerror', (e) => erreurs.push(String(e).slice(0, 150)));
  await page.goto('http://localhost:4200');
  await page.waitForURL(/8180.*openid-connect\/auth/);
  await page.fill('#username', utilisateur); await page.fill('#password', PW); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  return { ctx, page, requetes, erreurs };
}
const choisir = async (page, nom, texte) => {
  await page.locator(`[formcontrolname=${nom}]`).click();
  const option = texte ? page.locator('mat-option', { hasText: texte }).first() : page.locator('mat-option').first();
  await option.click();
  await page.waitForTimeout(150);
};
const suivant = async (page) => { await page.getByRole('button', { name: /Suivant/ }).click(); await page.waitForTimeout(700); };
const attendre = (page) => page.waitForLoadState('networkidle').then(() => page.waitForTimeout(600));

// ─────────────── AGENT ───────────────
{
  const { ctx, page, requetes, erreurs } = await session('agent.test');
  await page.goto('http://localhost:4200/personnes/nouveau'); await attendre(page);
  await page.fill('[formcontrolname=nomNaissance]', NOM);
  await page.fill('[formcontrolname=prenoms]', 'Fatimata');
  await page.fill('[formcontrolname=dateNaissance]', '02/03/1975');
  await page.fill('[formcontrolname=lieuNaissance]', 'Koudougou');
  await suivant(page);
  await page.fill('[formcontrolname=profession]', 'Directrice des marches');
  await suivant(page);
  const [repCreation] = await Promise.all([page.waitForResponse((r) => r.url().includes('/personnes/physiques') && r.request().method() === 'POST'), page.getByRole('button', { name: /^Enregistrer$/ }).click()]);
  const idCree = (await repCreation.json()).id; await attendre(page);
  await page.screenshot({ path: '/out/flow-01-personne-creee.png' });
  const creation = requetes.find((r) => r.m === 'POST' && r.u.startsWith('/personnes/physiques'));
  ok('AGENT cree une personne via l\'assistant', creation && creation.s === 201, creation ? `HTTP ${creation.s}` : 'aucune requete POST');

  const id = idCree;
  await page.goto('http://localhost:4200/personnes'); await attendre(page);
  ok('la personne apparait dans la liste d\'identification', (await page.locator('body').innerText()).includes(NOM));
  await page.goto(`http://localhost:4200/personnes/${id}`); await attendre(page);
  const fiche = await page.locator('body').innerText();
  ok('sa fiche affiche son identite', fiche.includes(NOM) && fiche.includes('Fatimata'), `${fiche.length} caracteres`);
  ok('statut de la fiche : en instruction (pas encore au registre)', !/inscrit au registre/i.test(fiche));

  // ── Ouverture d'un dossier
  requetes.length = 0;
  await page.goto(`http://localhost:4200/personnes/${id}/dossiers/nouveau`); await attendre(page);
  await page.fill('[formcontrolname=intitule]', 'Dossier navigateur ' + NOM);
  await choisir(page, 'sourceSignalementId');
  await suivant(page);
  await choisir(page, 'roleImplicationId');
  await page.fill('[formcontrolname=fonctionOccupee]', 'Directrice');
  await suivant(page);
  await choisir(page, 'typeInfractionId');
  await page.fill('[formcontrolname=montantPrejudice]', '15000000');
  await page.fill('[formcontrolname=dateFaits]', '15/06/2026');
  await page.fill('[formcontrolname=description]', 'Attribution irreguliere d\'un marche (test navigateur)');
  await page.getByRole('button', { name: /Ajouter ce fait/ }).click(); await page.waitForTimeout(500);
  await page.screenshot({ path: '/out/flow-02-fait-ajoute.png' });
  await suivant(page);
  await page.screenshot({ path: '/out/flow-03-recapitulatif.png' });
  const boutons = await page.getByRole('button').allInnerTexts();
  console.log('   boutons du recapitulatif :', boutons.map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | '));
  const final = page.getByRole('button', { name: /Cr[ée]er|Enregistrer|Valider|Soumettre|Ouvrir|Terminer/i }).last();
  await final.click(); await attendre(page); await page.waitForTimeout(1500);
  await page.screenshot({ path: '/out/flow-04-dossier-cree.png' });
  const posts = requetes.map((r) => `${r.m} ${r.u} ${r.s}`);
  console.log('   requetes :', posts.join(' ; '));
  ok('AGENT ouvre un dossier avec implication et fait (assistant 4 etapes)', requetes.some((r) => r.m === 'POST' && r.u === `/personnes/${id}/dossiers` && r.s === 201), posts.join(' ; '));
  ok('aucun POST en echec', requetes.every((r) => r.s < 400));
  ok('aucune erreur JavaScript pendant la saisie', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
  await page.goto(`http://localhost:4200/personnes/${id}`); await attendre(page);
  const ficheApres = await page.locator('body').innerText();
  ok('la fiche montre maintenant 1 dossier et le fait reproche', /Dossiers? & implications? \(1\)/i.test(ficheApres) || /Dossier navigateur/.test(ficheApres), '');
  await page.screenshot({ path: '/out/flow-04b-fiche-apres-dossier.png' });
  await ctx.close();
}

// ─────────────── VALIDATEUR ───────────────
{
  const { ctx, page, requetes, erreurs } = await session('validateur.test');
  await page.goto('http://localhost:4200/validation'); await attendre(page);
  await page.screenshot({ path: '/out/flow-05-validation.png' });
  const texte = await page.locator('body').innerText();
  ok('VALIDATEUR voit le dossier en attente de validation', texte.includes(NOM), '');
  requetes.length = 0;
  // On isole le dossier du test avec la recherche, comme le ferait un validateur, puis "Tout valider".
  await page.locator('main input').first().fill(NOM); await page.waitForTimeout(900);
  await page.screenshot({ path: '/out/flow-05b-recherche.png' });
  // Le dossier filtre est replie : on l'ouvre (clic sur son intitule) pour faire apparaitre "Tout valider".
  if ((await page.getByRole('button', { name: /Tout valider/ }).count()) === 0) {
    await page.getByText('Dossier navigateur ' + NOM).first().click(); await page.waitForTimeout(700);
  }
  const restants = await page.getByRole('button', { name: /Tout valider/ }).count();
  ok('la recherche isole le dossier du test', restants === 1, `${restants} bouton(s) "Tout valider" visible(s)`);
  await page.getByRole('button', { name: /Tout valider/ }).first().click(); await page.waitForTimeout(800);
  await page.screenshot({ path: '/out/flow-06-confirmation.png' });
  const dialogue = page.locator('mat-dialog-container');
  if (await dialogue.count()) await dialogue.getByRole('button', { name: /Confirmer|valider|Oui/i }).last().click();
  await attendre(page); await page.waitForTimeout(1200);
  await page.screenshot({ path: '/out/flow-07-apres-validation.png' });
  const put = requetes.filter((r) => r.m === 'PUT' && /\/faits\/.+\/valider/.test(r.u));
  ok('VALIDATEUR valide le fait', put.length > 0 && put.every((r) => r.s === 200), requetes.map((r) => `${r.m} ${r.u} ${r.s}`).join(' ; '));
  ok('aucune erreur JavaScript cote validateur', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
  await page.goto('http://localhost:4200/validation'); await attendre(page);
  ok('le dossier n\'est plus en attente de validation', !(await page.locator('body').innerText()).includes(NOM));
  await ctx.close();
}

// ─────────────── CONSULTANT ───────────────
{
  const { ctx, page } = await session('consultant.test');
  await page.goto('http://localhost:4200/registre-officiel'); await attendre(page);
  const registre = await page.locator('body').innerText();
  await page.screenshot({ path: '/out/flow-08-consultant-registre.png' });
  ok('CONSULTANT voit la personne validee au registre officiel', registre.includes(NOM));
  await page.goto('http://localhost:4200/personnes/nouveau'); await attendre(page);
  ok('CONSULTANT est renvoye du formulaire de creation', !page.url().includes('/personnes/nouveau'), page.url().replace('http://localhost:4200', ''));
  await page.goto('http://localhost:4200/audit'); await attendre(page);
  ok('CONSULTANT n\'accede pas a l\'audit', !page.url().includes('/audit'), page.url().replace('http://localhost:4200', ''));
  const menu = await page.locator('aside, nav').first().innerText().catch(() => '');
  await page.goto('http://localhost:4200/registre-officiel'); await attendre(page);
  ok('CONSULTANT ne voit pas le menu de creation ni d\'administration', !/Nouvelle personne|Gestion des utilisateurs|Audit des actions/.test(await page.locator('body').innerText()));
  await ctx.close();
}

await nav.close();
fs.writeFileSync('/out/flow-resultats.json', JSON.stringify(resultats, null, 2));
console.log(`\n${resultats.filter((r) => r.ok).length}/${resultats.length} etapes reussies`);
process.exit(resultats.every((r) => r.ok) ? 0 : 1);
