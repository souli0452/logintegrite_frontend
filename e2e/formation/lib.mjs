// Outils communs aux scripts de capture de la formation. Tout est fictif : personnes « EXEMPLE ».
import { chromium } from 'playwright';
import net from 'net';

export const SORTIE = process.env.SORTIE ?? '/out/formation';
export const PW = process.env.UI_PASSWORD;

export function pontPorts() {
  for (const port of [4200, 8180, 8080]) {
    net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
  }
}

export const pause = (page, ms = 700) => page.waitForTimeout(ms);

export async function ouvrir() {
  pontPorts();
  return chromium.launch();
}

/** Ouvre une session. `captureConnexion` : photographie la page de connexion avant de se connecter. */
export async function session(nav, utilisateur, { captureConnexion } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  let jeton = null;
  page.on('request', (r) => { const a = r.headers()['authorization']; if (a && r.url().includes('/api/v1/')) jeton = a; });
  await page.goto('http://localhost:4200');
  await page.waitForURL(/8180.*openid-connect\/auth/);
  await page.waitForTimeout(800);
  if (captureConnexion) await page.screenshot({ path: `${SORTIE}/${captureConnexion}.png` });
  await page.fill('#username', utilisateur); await page.fill('#password', PW); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  return { ctx, page, jeton: async () => { for (let i = 0; i < 30 && !jeton; i++) await page.waitForTimeout(300); return jeton; } };
}

export const api = (t) => async (m, c, corps) => {
  const r = await fetch('http://localhost:8080/api/v1' + c, { method: m, headers: { Authorization: t, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  let j = null; try { j = await r.json(); } catch { /* vide */ }
  return { s: r.status, j };
};

export async function photo(page, nom, options = {}) {
  await page.waitForTimeout(options.attente ?? 500);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: !!options.pageEntiere });
  console.log('  capture', nom);
}

/** Ouvre une liste deroulante Material puis choisit une option (premiere, ou celle qui contient `texte`). */
export async function choisir(page, nom, texte) {
  const champ = page.locator(`mat-dialog-container [formcontrolname=${nom}], main [formcontrolname=${nom}]`).first();
  await champ.click({ timeout: 8000 });
  await (texte ? page.locator('mat-option', { hasText: new RegExp(texte, 'i') }).first() : page.locator('mat-option').first()).click();
  await page.waitForTimeout(200);
}

export const suivant = async (page) => { await page.getByRole('button', { name: /Suivant/ }).click(); await page.waitForTimeout(800); };

export const FICTIF = { nom: process.env.NOM ?? 'EXEMPLE', prenoms: process.env.PRENOMS ?? 'Aminata', nip: process.env.NIP ?? 'FORMATION00000001', morale: 'ENTREPRISE EXEMPLE SARL' };
