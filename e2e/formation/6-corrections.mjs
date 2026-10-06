// Formation, partie 6 : captures des ecrans corriges (reprise d'un fait rejete, menus, dates, fiche du consultant).
// Variables : PERSONNE, DOSSIER (jeu DEMO Karim) ; AMINATA (id de la personne EXEMPLE).
import { ouvrir, session, api, photo, choisir, pause } from './lib.mjs';

const { PERSONNE, DOSSIER, AMINATA } = process.env;
const nav = await ouvrir();
const A = await session(nav, 'agent.test'); const ag = api(await A.jeton());
const V = await session(nav, 'validateur.test'); const va = api(await V.jeton());
const p = A.page;

// un second fait ; le validateur valide le premier et rejette le second avec un motif
const faits = (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j;
const second = await ag('POST', `/dossiers/${DOSSIER}/faits`, {
  typeInfractionId: faits[0].typeInfractionId, dateFaits: '2026-03-20', montantPrejudice: 3000000, devise: 'XOF',
  description: 'Falsification de bons de commande pour justifier les paiements.'
});
console.log('  second fait', second.s);
console.log('  validation', (await va('PUT', `/faits/${faits[0].id}/valider`)).s);
console.log('  rejet', (await va('PUT', `/faits/${second.j.id}/rejeter`, { motifRejet: 'Pièces justificatives insuffisantes : joindre les bons de commande.' })).s);

// 1. l'agent voit le motif et peut representer le fait
await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Faits reprochés/ }).click(); await pause(p, 1000);
await photo(p, '18b-dossier-fait-rejete');
await p.getByRole('button', { name: /Représenter à la validation/ }).click(); await pause(p, 1500);
await photo(p, '18c-dossier-fait-represente');
console.log('  validation 2', (await va('PUT', `/faits/${second.j.id}/valider`)).s);

// 2. menu de la ligne du dossier (fiche de DEMO Karim) + fiche + timeline
await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2500);
await photo(p, '08b-fiche-karim-statut');
await p.getByRole('tab', { name: /Dossiers/ }).click(); await pause(p, 900);
await p.locator('main .btn-icone-mini').last().click(); await pause(p, 700);
await photo(p, '22a-menu-ligne-dossier');
await p.keyboard.press('Escape'); await pause(p, 300);
await p.getByRole('tab', { name: /Timeline/ }).click(); await pause(p, 1000);
await photo(p, '53-fiche-timeline');

// 3. consultant : selecteur de date, resultat, fiche limitee (Aminata, qui a une peine)
const C = await session(nav, 'consultant.test'); const c = C.page;
await c.fill('[formcontrolname=nom]', 'EXEMPLE'); await c.fill('[formcontrolname=prenoms]', 'Aminata');
await c.fill('[formcontrolname=dateNaissance]', '14/05/1978'); await pause(c, 500);
await photo(c, '61-consultant-saisie');
await c.getByRole('button', { name: /Vérifier/ }).last().click(); await pause(c, 1800);
await photo(c, '62-consultant-resultat');
await c.getByRole('button', { name: /Voir la fiche/ }).first().click(); await pause(c, 2200);
await photo(c, '63-consultant-fiche-limitee');
await C.ctx.close();

// 4. administrateur : creation d'un compte de consultation, date proposee
const D = await session(nav, 'admin.test'); const d = D.page;
await d.goto('http://localhost:4200/administration'); await pause(d, 1800);
await d.getByRole('button', { name: /Créer un utilisateur/ }).click(); await pause(d, 1000);
await choisir(d, 'roleInitial', 'Consultant'); await pause(d, 600);
await photo(d, '72-admin-creation-utilisateur');
await D.ctx.close(); await A.ctx.close(); await V.ctx.close(); await nav.close(); process.exit(0);
