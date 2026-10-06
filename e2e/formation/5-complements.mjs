// Formation, partie 5 : ecrans complementaires (tableau de bord, statut judiciaire, menus d'actions).
import { ouvrir, session, photo, choisir, pause } from './lib.mjs';

const { PERSONNE, DOSSIER } = process.env;
const nav = await ouvrir();

{
  const A = await session(nav, 'agent.test'); const p = A.page;
  await p.goto('http://localhost:4200/tableau-de-bord'); await pause(p, 3500);
  await photo(p, '02-tableau-de-bord');
  await photo(p, '02b-tableau-de-bord-bas', { pageEntiere: true });
  await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2200);
  // statut judiciaire : le crayon du bloc « Statut judiciaire actuel »
  await p.locator('.btn-modifier-statut').first().click().catch(() => {});
  await pause(p, 1200);
  let dlg = await p.locator('mat-dialog-container').count();
  console.log('  dialogue statut ouvert :', dlg);
  if (dlg) {
    await photo(p, '56-statut-judiciaire-dialogue');
    await choisir(p, 'statutJudiciaireId', 'Mise en cause').catch(() => choisir(p, 'statutJudiciaireId'));
    await p.fill('[formcontrolname=autoriteCompetente]', 'Parquet du Tribunal de Grande Instance de Ouagadougou').catch(() => {});
    await p.fill('[formcontrolname=referenceAffaire]', 'RP 2026/0412').catch(() => {});
    await p.fill('[formcontrolname=motif]', 'Ouverture d\'une information judiciaire (exemple de formation).').catch(() => {});
    await photo(p, '57-statut-judiciaire-rempli');
    await p.keyboard.press('Escape');
  }
  await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
  await p.getByRole('button', { name: /Actions/ }).first().click(); await pause(p, 600);
  await photo(p, '58-dossier-menu-actions');
  await A.ctx.close();
}
{
  const V = await session(nav, 'validateur.test'); const p = V.page;
  await p.goto('http://localhost:4200/tableau-de-bord'); await pause(p, 3500);
  await photo(p, '49-validateur-tableau-de-bord');
  await V.ctx.close();
}
{
  const D = await session(nav, 'admin.test'); const p = D.page;
  await p.goto('http://localhost:4200/administration'); await pause(p, 2000);
  await p.locator('.btn-actions').nth(2).click().catch(() => {});
  await pause(p, 700);
  const items = await p.getByRole('menuitem').allInnerTexts(); console.log('  menu utilisateur :', items.map((i) => i.trim()).join(' | '));
  await photo(p, '73b-admin-menu-utilisateur');
  await p.keyboard.press('Escape');
  await D.ctx.close();
}
await nav.close(); process.exit(0);
