// Usage (pile Docker de developpement demarree : front :4200, Keycloak :8180, API :8080) :
//   docker run --rm --ipc=host -e UI_PASSWORD='<mot de passe du compte>' [-e UI_USER=admin.test] \
//     [-e UI_PERSONNE_ID=<uuid>] [-e UI_DOSSIER_ID=<uuid>] -v "$PWD/e2e:/work" -v "$PWD/e2e/out:/out" -w /work \
//     mcr.microsoft.com/playwright:v1.55.0-noble sh -c 'npm init -y >/dev/null; npm i playwright@1.55.0 --silent; node ui-check.mjs'
// Resultat : captures d'ecran (bureau et telephone) et out/rapport.json (erreurs console, reponses HTTP en echec, debordement).
// Verification visuelle de l'application dans un vrai navigateur (Chromium) : connexion reelle, parcours des ecrans,
// captures d'ecran ordinateur et telephone, collecte des erreurs console et des reponses HTTP en echec.
import { chromium } from 'playwright';
import net from 'net';
import fs from 'fs';

const PW = process.env.UI_PASSWORD;
const USER = process.env.UI_USER || 'admin.test';
const HOTE = process.env.UI_HOTE || 'host.docker.internal';

// Le navigateur est dans un conteneur : l'application (localhost:4200/8180/8080) est sur l'hote Docker.
for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => {
    const s = net.connect(port, HOTE);
    c.pipe(s); s.pipe(c);
    c.on('error', () => s.destroy()); s.on('error', () => c.destroy());
  }).listen(port, '127.0.0.1');
}

const ROUTES = ['/registre-officiel', '/tableau-de-bord', '/personnes', '/personnes/recherche', '/dossiers',
  '/validation', '/rapports', '/documents', '/audit', '/referentiels', '/administration'];

const navigateur = await chromium.launch();
const rapport = [];

async function parcours(nom, viewport) {
  const ctx = await navigateur.newContext({ viewport, locale: 'fr-FR' });
  const page = await ctx.newPage();
  let problemes = [];
  page.on('console', (m) => { if (m.type() === 'error') problemes.push('console: ' + m.text().slice(0, 160)); });
  page.on('pageerror', (e) => problemes.push('exception: ' + String(e).slice(0, 160)));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('login-status-iframe') && !r.url().includes('3p-cookies'))
      problemes.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`);
  });

  await page.goto('http://localhost:4200');
  await page.waitForURL(/8180\/realms\/logintegrite\/protocol\/openid-connect\/auth/, { timeout: 30000 });
  await page.screenshot({ path: `/out/${nom}-00-connexion.png` });
  await page.fill('#username', USER);
  await page.fill('#password', PW);
  await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  const lignes = [];
  const visiter = async (route, etiquette) => {
    problemes = [];
    if (route) await page.goto('http://localhost:4200' + route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    const texte = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    const debordement = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    const fichier = `${nom}-${etiquette}.png`;
    await page.screenshot({ path: `/out/${fichier}`, fullPage: false });
    lignes.push({ ecran: route || etiquette, url: page.url().replace('http://localhost:4200', ''), caracteres: texte.length,
      debordementHorizontal: debordement, erreurs: [...new Set(problemes)].slice(0, 4), extrait: texte.slice(0, 90) });
  };

  let i = 1;
  for (const r of ROUTES) await visiter(r, String(i++).padStart(2, '0') + r.replace(/\//g, '-'));

  // Fiche detaillee d'une personne (compose de nombreux composants OnPush : bandeau, onglets, KPI...)
  const idPersonne = process.env.UI_PERSONNE_ID;
  const idDossier = process.env.UI_DOSSIER_ID;
  if (idPersonne) {
    await visiter(`/personnes/${idPersonne}`, '20-fiche-personne');
    const onglets = await page.getByRole('tab').allInnerTexts();
    lignes.push({ ecran: 'onglets de la fiche', url: '', caracteres: onglets.length, erreurs: [], extrait: onglets.join(' | ') });
    for (const [k, nom] of onglets.entries()) {
      if (k === 0) continue;
      await page.getByRole('tab').nth(k).click();
      await page.waitForTimeout(500);
      await visiter(null, `21-onglet-${k}`);
    }
  }
  if (idDossier) await visiter(`/dossiers/${idDossier}`, '30-fiche-dossier');

  rapport.push({ parcours: nom, viewport, ecrans: lignes });
  await ctx.close();
}

await parcours('bureau', { width: 1366, height: 800 });
await parcours('telephone', { width: 390, height: 844 });
await navigateur.close();
fs.writeFileSync('/out/rapport.json', JSON.stringify(rapport, null, 2));
console.log('OK');
process.exit(0);
