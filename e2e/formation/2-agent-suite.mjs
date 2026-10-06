// Formation, partie 2 : l'agent poursuit. NIP, onglets du dossier, deuxieme fait, document, alias, recherche, rapports.
// Variables : PERSONNE, DOSSIER (identifiants produits par 1-agent.mjs).
import fs from 'fs';
import { ouvrir, session, api, photo, choisir, suivant, pause, FICTIF } from './lib.mjs';

const { PERSONNE, DOSSIER } = process.env;
const nav = await ouvrir();
const A = await session(nav, 'agent.test');
const p = A.page;
const agent = api(await A.jeton());

// --- le NIP de la personne d'exemple (le champ n'avait pas ete rempli a la creation)
let r = await agent('GET', `/personnes/physiques/${PERSONNE}`);
if (r.s === 200 && !r.j.nip) {
  const b = r.j;
  r = await agent('PUT', `/personnes/physiques/${PERSONNE}`, {
    nomNaissance: b.nomNaissance, prenoms: b.prenoms, sexe: b.sexe, dateNaissance: b.dateNaissance, lieuNaissance: b.lieuNaissance,
    nationaliteId: b.nationaliteId, profession: b.profession, telephone: b.telephone, adresse: b.adresse, nip: FICTIF.nip
  });
  console.log('  NIP enregistré :', r.s, r.j?.nip);
}

// --- l'assistant, avec le NIP, pour la capture (rien n'est enregistre)
await p.goto('http://localhost:4200/personnes/nouveau'); await pause(p, 1500);
await p.fill('app-champ-nip input', 'FORMATION00000099'); await pause(p, 1500);
await p.fill('[formcontrolname=nomNaissance]', 'EXEMPLE');
await p.fill('[formcontrolname=prenoms]', 'Aminata');
await choisir(p, 'sexe', 'F').catch(() => {});
await choisir(p, 'nationaliteId', 'Burkinab').catch(() => {});
await p.fill('[formcontrolname=dateNaissance]', '14/05/1978');
await p.fill('[formcontrolname=lieuNaissance]', 'Bobo-Dioulasso');
await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('main').evaluate((m) => (m.scrollTop = 0)).catch(() => {});
await photo(p, '05-creation-etape1-identite');

// --- la fiche, maintenant avec son NIP
await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2500);
await photo(p, '08-fiche-personne-apercu');
await p.getByRole('tab', { name: /Fiche identitaire/ }).click().catch(() => {}); await pause(p, 900);
await photo(p, '09-fiche-personne-identitaire');
await p.getByRole('tab', { name: /Dossiers & implications/ }).click().catch(() => {}); await pause(p, 900);
await photo(p, '19-fiche-personne-dossiers');

// --- alias et pieces d'identite depuis l'apercu
await p.getByRole('tab', { name: /Aperçu/ }).click().catch(() => {}); await pause(p, 700);
await p.getByRole('button', { name: /Ajouter/ }).first().click().catch(() => {}); await pause(p, 900);
await photo(p, '20-ajout-alias');
await p.keyboard.press('Escape'); await pause(p, 400);

// --- le dossier : onglets
await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Personnes impliquées/ }).click().catch(() => {}); await pause(p, 700);
await photo(p, '21-dossier-onglet-personnes');
// un fait supplementaire s'ajoute depuis la fiche de la personne : onglet Dossiers, menu de la ligne du dossier
await p.goto(`http://localhost:4200/personnes/${PERSONNE}`); await pause(p, 2000);
await p.getByRole('tab', { name: /Dossiers/ }).click(); await pause(p, 800);
await p.locator('main .btn-icone-mini').last().click(); await pause(p, 700);
await photo(p, '22a-menu-ligne-dossier');
await p.getByRole('menuitem', { name: /Ajouter un fait/ }).click();
await p.locator('mat-dialog-container').waitFor(); await pause(p, 1200);
await photo(p, '22-ajout-fait-dialogue');
await choisir(p, 'dossierId').catch(() => {});
await choisir(p, 'typeInfractionId', 'faux').catch(() => choisir(p, 'typeInfractionId'));
await p.fill('[formcontrolname=montantPrejudice]', '3000000').catch(() => {});
await p.fill('[formcontrolname=dateFaits]', '20/03/2026').catch(() => {});
await p.fill('[formcontrolname=description]', 'Falsification de bons de commande pour justifier les paiements.').catch(() => {});
await photo(p, '23-ajout-fait-rempli');
const boutons = await p.locator('mat-dialog-container button').allInnerTexts();
console.log('  boutons du dialogue :', boutons.map((b) => b.trim()).filter(Boolean).join(' | '));
const [rf] = await Promise.all([
  p.waitForResponse((x) => /\/faits/.test(x.url()) && x.request().method() === 'POST', { timeout: 15000 }).catch(() => null),
  p.locator('mat-dialog-container').getByRole('button', { name: /Enregistrer|Reprocher|Ajouter le fait|Valider/ }).last().click()
]);
console.log('  second fait :', rf?.status());
await pause(p, 1800);
await p.goto(`http://localhost:4200/dossiers/${DOSSIER}`); await pause(p, 2200);
await p.getByRole('tab', { name: /Faits reprochés/ }).click(); await pause(p, 900);
await photo(p, '24-dossier-deux-faits');

// --- documents : depot d'un PDF
fs.writeFileSync('/tmp/rapport-exemple.pdf', '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
await p.getByRole('tab', { name: /Documents/ }).click(); await pause(p, 800);
await photo(p, '25-dossier-onglet-documents');
await p.getByRole('button', { name: /Ajouter (des|le premier) documents?/ }).first().click().catch(() => {}); await pause(p, 1200);
await photo(p, '26-depot-document-dialogue');
await p.locator('mat-dialog-container input[type=file]').setInputFiles('/tmp/rapport-exemple.pdf').catch(() => {}); await pause(p, 800);
await choisir(p, 'typeDocumentId', '').catch(() => {});
await photo(p, '27-depot-document-rempli');
await p.keyboard.press('Escape'); await pause(p, 500);

// --- recherche avancee, repertoire, rapports
await p.goto('http://localhost:4200/personnes/recherche'); await pause(p, 1500);
await photo(p, '28-recherche-avancee');
await p.goto('http://localhost:4200/registre-officiel'); await pause(p, 2000);
await photo(p, '29-repertoire-officiel');
await p.goto('http://localhost:4200/rapports'); await pause(p, 1500);
await photo(p, '30-rapports');
await p.goto('http://localhost:4200/dossiers'); await pause(p, 2000);
await photo(p, '31-liste-dossiers');

await A.ctx.close(); await nav.close(); process.exit(0);
