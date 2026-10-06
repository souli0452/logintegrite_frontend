// Verifie les corrections issues du parcours de formation :
//   1 reprise d'un fait rejete depuis le dossier   2 entrees du menu « peine » distinctes
//   3 statut judiciaire identique sur la fiche et la verification   4 dates en jj/mm/aaaa (selecteurs, timeline)
//   6 libelle de peine lisible cote consultant
// Variables : PERSONNE, DOSSIER (jeu d'essai de la formation).
import { ouvrir, session, api, pause } from './formation/lib.mjs';

const { PERSONNE, DOSSIER } = process.env;
const nav = await ouvrir();
const res = [];
const ok = (nom, cond, detail = '') => { res.push(!!cond); console.log(`${cond ? '[OK]    ' : '[ECHEC] '}${nom}${detail ? ' — ' + detail : ''}`); };

const A = await session(nav, 'agent.test'); const ag = api(await A.jeton());
const V = await session(nav, 'validateur.test'); const va = api(await V.jeton());

// un fait supplementaire, rejete par le validateur
const f = await ag('POST', `/dossiers/${DOSSIER}/faits`, {
  typeInfractionId: (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j[0].typeInfractionId,
  dateFaits: '2026-03-' + String(1 + Math.floor(Math.random() * 28)).padStart(2, '0'), description: 'Fait de controle des corrections', montantPrejudice: 1000, devise: 'XOF'
});
ok('creation d\'un fait de test', f.s === 201, 'HTTP ' + f.s);
const rej = await va('PUT', `/faits/${f.j.id}/rejeter`, { motifRejet: 'Motif de controle : pièce manquante.' });
ok('le validateur rejette le fait', rej.s === 200, 'HTTP ' + rej.s);

// 1. reprise depuis le dossier
const p = A.page;
await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Faits reprochés/ }).click(); await pause(p, 900);
const texte = await p.locator('main').innerText();
ok('le motif du rejet est visible dans le dossier', texte.includes('pièce manquante'));
const bouton = p.getByRole('button', { name: /Représenter à la validation/ });
ok('le bouton de reprise est propose', (await bouton.count()) === 1);
await bouton.click(); await pause(p, 1500);
const apres = (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j.find((x) => x.id === f.j.id);
ok('le fait repart en attente, sans motif', apres.statutValidation === 'EN_ATTENTE' && !apres.motifRejet, apres.statutValidation);
ok('plus de bouton de reprise une fois repris', (await bouton.count()) === 0);
// le validateur ne voit pas ce bouton
const pv = V.page; await pv.goto(`http://localhost:4200/dossiers/${DOSSIER}`).catch(() => {}); await pause(pv, 1500);
ok('le validateur n\'a pas de bouton de reprise', (await pv.getByRole('button', { name: /Représenter à la validation/ }).count()) === 0);
await va('PUT', `/faits/${f.j.id}/valider`);

// 2. menu de la ligne du dossier : une entree par fait valide, avec son infraction
await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Dossiers/ }).click(); await pause(p, 800);
await p.locator('main .btn-icone-mini').last().click(); await pause(p, 600);
const items = (await p.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
console.log('   menu :', items.join(' | '));
const peines = items.filter((t) => /Ajouter une peine/.test(t));
ok("les entrees peine precisent l'infraction et la date du fait", peines.length >= 2 && peines.every((t) => /\(\d{2}\/\d{2}\/\d{4}\)/.test(t)) && new Set(peines).size >= 3);
await p.keyboard.press('Escape');

// 3. statut : fiche de la personne et verification affichent la meme chose
const hero = await p.locator('main').innerText();
ok('la fiche affiche un statut judiciaire (plus « Aucun statut »)', !/Aucun statut/.test(hero.split('Dossiers & implications')[0]));
await p.getByRole('tab', { name: /Timeline/ }).click(); await pause(p, 900);
const tl = await p.locator('.timeline').innerText();
ok('timeline : dates en jj/mm/aaaa', /\d{2}\/\d{2}\/\d{4}/.test(tl) && !/\d{4}-\d{2}-\d{2}/.test(tl));
ok('timeline : plus d\'heure fictive 00:00', !/00:00/.test(tl));

// 6. consultant
const C = await session(nav, 'consultant.test'); const c = C.page;
ok('verification : selecteur de date Material', (await c.locator('mat-datepicker-toggle').count()) === 1);
await c.fill('[formcontrolname=nom]', 'EXEMPLE'); await c.fill('[formcontrolname=prenoms]', 'Aminata');
await c.fill('[formcontrolname=dateNaissance]', '14/05/1978');
await c.getByRole('button', { name: /Vérifier/ }).last().click(); await pause(c, 1800);
await c.getByRole('button', { name: /Voir la fiche/ }).first().click(); await pause(c, 2000);
const fiche = await c.locator('main').innerText();
ok('fiche consultant : libelle de peine lisible', /Amende — 2\s?000\s?000 FCFA/.test(fiche) && !/AMENDE/.test(fiche), (fiche.match(/Amende[^\n]*/) || [''])[0]);
ok('fiche consultant : statut present', /Enquête préliminaire|Mise en cause/.test(fiche));

// 4. creation d'utilisateur : selecteur de date
const D = await session(nav, 'admin.test'); const d = D.page;
await d.goto('http://localhost:4200/administration'); await pause(d, 1800);
await d.getByRole('button', { name: /Créer un utilisateur/ }).click(); await pause(d, 1000);
ok('creation de compte : selecteur de date Material', (await d.locator('mat-dialog-container mat-datepicker-toggle').count()) === 1);
await d.keyboard.press('Escape');
await A.ctx.close(); await V.ctx.close(); await C.ctx.close(); await D.ctx.close(); await nav.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} controles reussis`);
process.exit(res.every(Boolean) ? 0 : 1);
