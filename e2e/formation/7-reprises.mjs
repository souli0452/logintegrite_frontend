// Formation, partie 7 : captures definitives apres corrections. AMINATA (fil rouge) et KARIM (fait rejete puis represente).
import { ouvrir, session, api, photo, pause } from './lib.mjs';

const { PERSONNE, DOSSIER, AMINATA } = process.env;
const nav = await ouvrir();
const A = await session(nav, 'agent.test'); const ag = api(await A.jeton());
const V = await session(nav, 'validateur.test'); const va = api(await V.jeton());
const p = A.page;
const basDePage = () => p.evaluate(() => document.querySelectorAll('main, .contenu, body').forEach((e) => { e.scrollTop = e.scrollHeight; }));

// Karim : un troisieme fait, rejete par le validateur, represente par l'agent
const faits = (await ag('GET', `/dossiers/${DOSSIER}/faits`)).j;
const f = await ag('POST', `/dossiers/${DOSSIER}/faits`, {
  typeInfractionId: faits[0].typeInfractionId, dateFaits: '2026-03-28', montantPrejudice: 1500000, devise: 'XOF',
  description: 'Paiement sans pièce justificative.'
});
await va('PUT', `/faits/${f.j.id}/rejeter`, { motifRejet: 'Pièces justificatives insuffisantes : joindre les bons de commande.' });
await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Faits reprochés/ }).click(); await pause(p, 900);
await basDePage(); await pause(p, 600);
await photo(p, '18b-dossier-fait-rejete');
await p.getByRole('button', { name: /Représenter à la validation/ }).click(); await pause(p, 1500);
await basDePage(); await pause(p, 400);
await photo(p, '18c-dossier-fait-represente');
await va('PUT', `/faits/${f.j.id}/valider`);

// Aminata : fiche, menu, timeline
await p.goto(`http://localhost:4200/personnes/${AMINATA}`); await pause(p, 2500);
await photo(p, '08-fiche-personne-apercu');
await p.getByRole('tab', { name: /Dossiers/ }).click(); await pause(p, 900);
await p.locator('main .btn-icone-mini').last().click(); await pause(p, 700);
await photo(p, '22a-menu-ligne-dossier');
await p.keyboard.press('Escape'); await pause(p, 300);
await p.getByRole('tab', { name: /Timeline/ }).click(); await pause(p, 1000);
await photo(p, '53-fiche-timeline');

// consultant
const C = await session(nav, 'consultant.test'); const c = C.page;
await c.fill('[formcontrolname=nom]', 'EXEMPLE'); await c.fill('[formcontrolname=prenoms]', 'Aminata');
await c.fill('[formcontrolname=dateNaissance]', '14/05/1978'); await pause(c, 500);
await photo(c, '61-consultant-saisie');
await c.getByRole('button', { name: /Vérifier/ }).last().click(); await pause(c, 1800);
await photo(c, '62-consultant-resultat');
await c.getByRole('button', { name: /Voir la fiche/ }).first().click(); await pause(c, 2200);
await photo(c, '63-consultant-fiche-limitee');
await C.ctx.close(); await A.ctx.close(); await V.ctx.close(); await nav.close(); process.exit(0);
