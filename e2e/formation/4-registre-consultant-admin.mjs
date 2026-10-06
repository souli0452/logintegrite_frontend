// Formation, partie 4 : mise au registre (reprise + validation par API), puis consultant et administrateur.
// Variables : PERSONNE, DOSSIER.
import { ouvrir, session, api, photo, choisir, pause, FICTIF } from './lib.mjs';

const { PERSONNE, DOSSIER } = process.env;
const nav = await ouvrir();

// --- la personne entre au registre : l'agent reprend le fait rejete, le validateur valide tout
{
  const A = await session(nav, 'agent.test'); const ag = api(await A.jeton());
  const V = await session(nav, 'validateur.test'); const va = api(await V.jeton());
  const faits = (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j;
  for (const f of faits) {
    if (f.statutValidation === 'REJETEE') console.log('  reprise', (await ag('PUT', `/faits/${f.id}/reprendre`)).s);
  }
  for (const f of (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j) {
    if (f.statutValidation === 'EN_ATTENTE') console.log('  validation', (await va('PUT', `/faits/${f.id}/valider`)).s);
  }
  await A.ctx.close(); await V.ctx.close();
}

// --- agent : fiche de la personne, maintenant au registre ; statut judiciaire et peine
if (!process.env.SANS_AGENT) {
  const A = await session(nav, 'agent.test'); const p = A.page;
  await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2200);
  await p.getByRole('button', { name: /Actions/ }).first().click(); await pause(p, 500);
  await p.keyboard.press('Escape');
  await p.locator('main .btn-icone-mini').first().click().catch(() => {});
  await p.getByRole('tab', { name: /Dossiers/ }).click(); await pause(p, 800);
  await p.locator('main .btn-icone-mini').last().click(); await pause(p, 700);
  const menu = await p.getByRole('menuitem').allInnerTexts(); console.log('  menu ligne :', menu.map((m) => m.trim()).join(' | '));
  await p.getByRole('menuitem', { name: /Ajouter une peine/ }).first().click(); await pause(p, 1500);
  await photo(p, '50-ajout-peine-dialogue');
  await choisir(p, 'typePeine', 'Amende');
  await p.fill('[formcontrolname=montantAmende]', '2000000');
  await p.fill('[formcontrolname=dateDecision]', '20/09/2026');
  await p.fill('[formcontrolname=description]', 'Amende prononcée (exemple de formation).');
  await photo(p, '51-ajout-peine-rempli');
  await p.getByRole('button', { name: /Enregistrer la peine/ }).click(); await pause(p, 1800);
  await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2000);
  await p.locator('main button[aria-label*="statut" i], main .btn-edit-statut, main button:has(mat-icon)').first().click().catch(() => {});
  await p.getByRole('tab', { name: /Peines/ }).click(); await pause(p, 900);
  await photo(p, '52-fiche-peines');
  await p.getByRole('tab', { name: /Timeline/ }).click(); await pause(p, 900);
  await photo(p, '53-fiche-timeline');
  await p.getByRole('tab', { name: /Documents/ }).click(); await pause(p, 900);
  await photo(p, '54-fiche-documents');
  await p.goto('http://localhost:4200/registre-officiel'); await pause(p, 1500);
  await p.locator('main input').first().fill('EXEMPLE'); await pause(p, 1500);
  await photo(p, '55-registre-personne-presente');
  await A.ctx.close();
}

// --- consultant
{
  const C = await session(nav, 'consultant.test'); const p = C.page;
  await photo(p, '60-consultant-accueil');
  await p.locator('[formcontrolname=nom], input').first().waitFor();
  const champs = await p.locator('main input').evaluateAll((l) => l.map((i) => i.getAttribute('formcontrolname') || i.placeholder || i.type));
  console.log('  champs verification :', champs.join(' | '));
  await p.fill('[formcontrolname=nom]', FICTIF.nom).catch(() => {});
  await p.fill('[formcontrolname=prenoms]', FICTIF.prenoms).catch(() => {});
  await p.fill('[formcontrolname=dateNaissance]', '1978-05-14').catch(() => {});
  await photo(p, '61-consultant-saisie');
  await p.getByRole('button', { name: /Vérifier/ }).last().click(); await pause(p, 1800);
  await photo(p, '62-consultant-resultat');
  await p.getByRole('button', { name: /Voir la fiche/ }).first().click(); await pause(p, 2000);
  await photo(p, '63-consultant-fiche-limitee');
  await p.getByRole('button', { name: /Demander l'export/ }).click().catch(() => {}); await pause(p, 1000);
  await photo(p, '64-consultant-demande-export');
  await p.locator('mat-dialog-container textarea').fill('Vérification préalable avant la signature d\'un marché public avec cette personne.').catch(() => {});
  await photo(p, '65-consultant-demande-motif');
  await p.locator('mat-dialog-container').getByRole('button', { name: /Envoyer|Demander|Confirmer|Transmettre/ }).last().click().catch(() => {}); await pause(p, 1500);
  await p.goto('http://localhost:4200/verification/mes-demandes'); await pause(p, 1800);
  await photo(p, '66-consultant-mes-demandes');
  await C.ctx.close();
}

// --- administrateur
{
  const D = await session(nav, 'admin.test'); const p = D.page;
  await photo(p, '70-admin-tableau-de-bord');
  await p.goto('http://localhost:4200/administration'); await pause(p, 2000);
  await photo(p, '71-admin-utilisateurs');
  await p.getByRole('button', { name: /Nouvel utilisateur|Créer|Ajouter/ }).first().click().catch(() => {}); await pause(p, 1200);
  await photo(p, '72-admin-creation-utilisateur');
  await p.keyboard.press('Escape'); await pause(p, 500);
  await p.goto('http://localhost:4200/demandes-export'); await pause(p, 2000);
  await photo(p, '73-admin-demandes-dossier');
  await p.locator('main button').filter({ hasText: /Accorder/ }).first().click().catch(() => {}); await pause(p, 1000);
  await photo(p, '74-admin-accorder');
  await p.keyboard.press('Escape'); await pause(p, 500);
  await p.goto('http://localhost:4200/referentiels'); await pause(p, 1800);
  await photo(p, '75-admin-referentiels');
  await p.goto('http://localhost:4200/referentiels/categories-infraction'); await pause(p, 1800);
  await photo(p, '76-admin-referentiel-exemple');
  await p.goto('http://localhost:4200/audit'); await pause(p, 2200);
  await photo(p, '77-audit-modifications');
  for (const [nom, fichier] of [[/Consultations/, '78-audit-consultations'], [/Connexions/, '79-audit-connexions'], [/Poste/, '80-audit-poste']]) {
    await p.getByRole('tab', { name: nom }).click().catch(() => {}); await pause(p, 1500);
    await photo(p, fichier);
  }
  await p.getByRole('tab', { name: /Modifications/ }).click().catch(() => {}); await pause(p, 1200);
  await p.locator('app-bandeau-integrite button').filter({ hasText: /Vérifier/ }).first().click().catch(() => {}); await pause(p, 3500);
  await photo(p, '81-audit-verification-chaine');
  await p.goto('http://localhost:4200/personnes'); await pause(p, 1800);
  await photo(p, '82-admin-personnes-corbeille');
  await D.ctx.close();
}
await nav.close(); process.exit(0);
