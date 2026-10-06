// Formation, partie 3 : le validateur. Tableau de bord, file de validation, validation d'un fait, rejet avec motif.
// Variable : DOSSIER (produit par 1-agent.mjs). Le dossier d'exemple a deux faits en attente.
import { ouvrir, session, photo, pause } from './lib.mjs';

const nav = await ouvrir();
const V = await session(nav, 'validateur.test');
const p = V.page;

await photo(p, '40-validateur-tableau-de-bord');
await p.goto('http://localhost:4200/validation'); await pause(p, 1800);
await p.locator('main input').first().fill('EXEMPLE'); await pause(p, 1200);
await photo(p, '41-validation-file');
if ((await p.locator('main table').count()) === 0) { await p.getByText(/Marchés de fournitures/).first().click().catch(() => {}); await pause(p, 800); await photo(p, '41b-validation-dossier'); }

// valider le premier fait (le detournement)
const lignes = p.locator('main table tbody tr');
console.log('  lignes :', await lignes.count());
await lignes.first().locator('button').first().click(); await pause(p, 900);
await photo(p, '42-validation-valider-dialogue');
const conf = p.locator('mat-dialog-container').getByRole('button', { name: /Valider|Confirmer/i }).last();
if (await conf.count()) { await conf.click(); await pause(p, 1500); }
await photo(p, '43-validation-apres-validation');

// rejeter le second avec un motif
await p.locator('main input').first().fill('EXEMPLE'); await pause(p, 900);
const reste = p.locator('main table tbody tr');
if (await reste.count()) {
  await reste.first().locator('button').last().click(); await pause(p, 900);
  await photo(p, '44-validation-rejet-dialogue');
  await p.locator('mat-dialog-container textarea, mat-dialog-container input').first().fill('Pièces justificatives insuffisantes : joindre les bons de commande.');
  await photo(p, '45-validation-rejet-motif');
  await p.locator('mat-dialog-container').getByRole('button', { name: /Rejeter|Confirmer/i }).last().click(); await pause(p, 1500);
}
await p.goto('http://localhost:4200/validation'); await pause(p, 1200);
await p.getByRole('tab', { name: /Rejet/ }).click().catch(() => {}); await pause(p, 900);
await photo(p, '46-validation-onglet-rejetes');
await p.getByRole('tab', { name: /Valid/ }).first().click().catch(() => {}); await pause(p, 900);
await photo(p, '47-validation-onglet-valides');

await p.goto('http://localhost:4200/registre-officiel'); await pause(p, 2000);
await photo(p, '48-validateur-repertoire');
await V.ctx.close(); await nav.close(); process.exit(0);
