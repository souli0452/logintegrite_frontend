// Parcours d'un compte de consultation : verification d'une personne precise, fiche, demande d'export, decision admin.
// Variables : UI_PASSWORD (mot de passe des comptes de test), REG_NUM (numero d'une personne du registre officiel).
import { chromium } from 'playwright';
import net from 'net';

for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
}
const REG_NUM = process.env.REG_NUM;
const sortie = process.env.SORTIE ?? '/out';
const nav = await chromium.launch();
let echecs = 0;
const ok = (n, v, d = '') => { if (!v) echecs++; console.log(v ? '[OK]   ' : '[ECHEC]', n, d); };

async function ouvrirSession(user, viewport = { width: 1440, height: 900 }) {
  const ctx = await nav.newContext({ viewport });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('http://localhost:4200'); await page.waitForURL(/8180.*auth/);
  await page.fill('#username', user); await page.fill('#password', process.env.UI_PASSWORD); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  return { ctx, page, erreurs };
}

// ---------------- consultant
const c = await ouvrirSession('consultant.test');
ok("accueil d'un consultant : la page de vérification", /\/verification$/.test(c.page.url()), c.page.url());
const menu = (await c.page.locator('app-sidebar a').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
ok('menu du consultant : uniquement la vérification et ses demandes', menu.join('|') === 'Vérifier une personne|Mes demandes de dossier', menu.join(' | '));
await c.page.screenshot({ path: `${sortie}/consultation-01-recherche.png` });

await c.page.goto('http://localhost:4200/personnes'); await c.page.waitForTimeout(1200);
ok("accès à la liste des personnes : renvoyé vers la vérification", /\/verification$/.test(c.page.url()), c.page.url());
await c.page.goto('http://localhost:4200/dossiers'); await c.page.waitForTimeout(1200);
ok("accès à la liste des dossiers : renvoyé vers la vérification", /\/verification$/.test(c.page.url()), c.page.url());

await c.page.getByRole('button', { name: 'Par numéro' }).click();
await c.page.getByLabel('Numéro', { exact: true }).fill('PER');
ok('numéro trop court : bouton Vérifier désactivé', await c.page.getByRole('button', { name: 'Vérifier', exact: true }).isDisabled());
await c.page.locator('mat-select').click(); await c.page.getByRole('option', { name: /Numéro de personne/ }).click();
await c.page.getByLabel('Numéro', { exact: true }).fill(REG_NUM);
await c.page.getByRole('button', { name: 'Vérifier', exact: true }).click(); await c.page.waitForTimeout(1500);
ok('résultat : la personne du registre est trouvée', await c.page.locator('.resultat').count() === 1);
await c.page.screenshot({ path: `${sortie}/consultation-02-resultat.png` });

await c.page.getByRole('button', { name: 'Voir la fiche' }).click(); await c.page.waitForTimeout(2000);
ok('fiche : au moins un dossier validé affiché', await c.page.locator('.dossier').count() >= 1);
ok('fiche : un statut judiciaire est affiché', await c.page.locator('.statut').count() >= 1);
const texteFiche = await c.page.locator('app-verification-fiche').innerText();
ok("fiche : ni document, ni adresse, ni téléphone", !/adresse|téléphone|document joint/i.test(texteFiche));
await c.page.screenshot({ path: `${sortie}/consultation-03-fiche.png`, fullPage: true });

await c.page.getByRole('button', { name: /Demander l'export/ }).click(); await c.page.waitForTimeout(800);
ok('demande : bouton Envoyer désactivé tant que le motif est trop court', await c.page.getByRole('button', { name: 'Envoyer la demande' }).isDisabled());
await c.page.getByLabel('Motif de la demande').fill('Verification prealable a une nomination au poste de comptable principal');
await c.page.screenshot({ path: `${sortie}/consultation-04-demande.png` });
await c.page.getByRole('button', { name: 'Envoyer la demande' }).click(); await c.page.waitForTimeout(1800);
ok('après envoi : page « Mes demandes »', /mes-demandes$/.test(c.page.url()), c.page.url());
ok('demande listée « En attente »', (await c.page.locator('.demande').first().innerText()).includes('En attente'));
await c.page.screenshot({ path: `${sortie}/consultation-05-mes-demandes.png` });
ok('aucune erreur JavaScript (consultant)', c.erreurs.length === 0, c.erreurs.join(' | '));
await c.ctx.close();

// ---------------- administrateur
const a = await ouvrirSession('admin.test');
await a.page.goto('http://localhost:4200/demandes-export'); await a.page.waitForTimeout(2000);
ok('admin : la demande en attente est listée', await a.page.locator('.demande', { hasText: 'comptable principal' }).count() >= 1);
await a.page.screenshot({ path: `${sortie}/consultation-06-admin.png` });
await a.page.locator('.demande', { hasText: 'comptable principal' }).first().getByRole('button', { name: 'Accorder' }).click();
await a.page.waitForTimeout(600);
await a.page.getByLabel('Modalités de transmission').fill('Transmis par courrier officiel');
await a.page.getByRole('button', { name: 'Accorder', exact: true }).click(); await a.page.waitForTimeout(1800);
ok('admin : la demande accordée quitte la liste « En attente »', await a.page.locator('.demande', { hasText: 'comptable principal' }).count() === 0);
ok('aucune erreur JavaScript (admin)', a.erreurs.length === 0, a.erreurs.join(' | '));
await a.ctx.close();

console.log(echecs === 0 ? '\nTOUT EST CONFORME' : `\n${echecs} ECHEC(S)`);
await nav.close(); process.exit(echecs ? 1 : 0);
