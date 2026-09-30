// Accessibilite : compte les boutons et liens visibles sans nom accessible (ni texte, ni aria-label, ni title) sur les ecrans
// principaux. Variables : UI_PASSWORD, PID (uuid d'une personne), DID (uuid d'un dossier). Objectif : TOTAL = 0.
import { chromium } from 'playwright';
import net from 'net';
for (const port of [4200, 8180, 8080]) net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
const nav = await chromium.launch();
const page = await (await nav.newContext({ viewport: { width: 1366, height: 1000 } })).newPage();
await page.goto('http://localhost:4200'); await page.waitForURL(/8180.*auth/);
await page.fill('#username', 'admin.test'); await page.fill('#password', process.env.UI_PASSWORD); await page.click('#kc-login');
await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
const routes = ['/registre-officiel', '/personnes', '/personnes/' + process.env.PID, '/dossiers', '/dossiers/' + process.env.DID, '/validation', '/audit', '/referentiels', '/referentiels/categories-infraction', '/referentiels/nationalites', '/administration', '/rapports'];
let total = 0;
for (const r of routes) {
  await page.goto('http://localhost:4200' + r); await page.waitForTimeout(1500);
  if (r.startsWith('/personnes/')) { for (const t of await page.getByRole('tab').all()) { await t.click(); await page.waitForTimeout(350); } }
  const sans = await page.evaluate(() => [...document.querySelectorAll('button, a[href], [role=button]')].filter((e) => {
    const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false;
    return !(e.textContent || '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title') && !(e.querySelector('img')?.getAttribute('alt'));
  }).map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ').filter((c) => !c.startsWith('mat-mdc') && !c.startsWith('mdc') && !c.startsWith('mat-')).slice(0, 2).join('.')}`));
  total += sans.length;
  console.log(`${r.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, '<id>').padEnd(38)} ${sans.length} sans nom${sans.length ? '  ' + [...new Set(sans)].join(', ') : ''}`);
}
console.log('TOTAL sans nom accessible:', total);
await nav.close(); process.exit(0);
