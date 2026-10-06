// Formation, partie 1 : l'agent de saisie. Connexion, tableau de bord, creation d'une personne (3 etapes),
// ouverture d'un dossier (4 etapes), fiche et dossier. Captures dans SORTIE.
import { ouvrir, session, photo, choisir, suivant, pause, FICTIF } from './lib.mjs';

const nav = await ouvrir();
const A = await session(nav, 'agent.test', { captureConnexion: '01-connexion' });
const p = A.page;

await photo(p, '02-tableau-de-bord');

// --- la liste des personnes
await p.goto('http://localhost:4200/personnes'); await pause(p, 1800);
await photo(p, '03-liste-personnes');

// --- creation d'une personne physique : etape 1
await p.goto('http://localhost:4200/personnes/nouveau'); await pause(p, 1500);
await photo(p, '04-nouvelle-personne-choix');
await p.fill('[formcontrolname=nip]', FICTIF.nip).catch(() => {});
await p.fill('[formcontrolname=nomNaissance]', FICTIF.nom);
await p.fill('[formcontrolname=prenoms]', FICTIF.prenoms);
await choisir(p, 'sexe', 'F').catch(() => choisir(p, 'sexe'));
await choisir(p, 'nationaliteId', 'Burkinab').catch(() => choisir(p, 'nationaliteId'));
await p.fill('[formcontrolname=dateNaissance]', '14/05/1978');
await p.fill('[formcontrolname=lieuNaissance]', 'Bobo-Dioulasso');
await pause(p, 1200);
await photo(p, '05-creation-etape1-identite');

// etape 2
await suivant(p);
await choisir(p, 'situationMatrimoniale', 'Mari').catch(() => {});
await p.fill('[formcontrolname=profession]', 'Directrice financière').catch(() => {});
await p.fill('[formcontrolname=telephone]', '70 00 00 00').catch(() => {});
await p.fill('[formcontrolname=adresse]', 'Ouagadougou, secteur 15').catch(() => {});
await photo(p, '06-creation-etape2-administrative');

// etape 3
await suivant(p);
await photo(p, '07-creation-etape3-documents');

const [rep] = await Promise.all([
  p.waitForResponse((r) => r.url().includes('/personnes/physiques') && r.request().method() === 'POST'),
  p.getByRole('button', { name: /^Enregistrer$/ }).click()
]);
const personne = await rep.json();
console.log('  personne créée', personne.numeroPersonne, 'NIP', personne.nip);
await pause(p, 1500);

// --- la fiche de la personne
await p.goto(`http://localhost:4200/personnes/${personne.id}`); await pause(p, 2500);
await photo(p, '08-fiche-personne-apercu');
await p.getByRole('tab', { name: /Fiche identitaire/ }).click().catch(() => {}); await pause(p, 900);
await photo(p, '09-fiche-personne-identitaire');
await p.getByRole('tab', { name: /Aperçu/ }).click().catch(() => {}); await pause(p, 700);
await p.getByRole('button', { name: /Actions/ }).first().click(); await pause(p, 500);
await photo(p, '10-fiche-personne-menu-actions');

// --- ouverture d'un dossier depuis la fiche
await p.getByRole('menuitem', { name: /Ajouter un dossier/ }).click(); await pause(p, 2000);
await photo(p, '11-dossier-etape1');
await p.fill('[formcontrolname=intitule]', 'Marchés de fournitures — dossier d\'exemple');
await choisir(p, 'sourceSignalementId', 'nonciation').catch(() => choisir(p, 'sourceSignalementId'));
await p.fill('[formcontrolname=descriptionContexte]', 'Dossier fictif utilisé pour la formation : irrégularités présumées dans l\'attribution de marchés de fournitures.').catch(() => {});
await pause(p, 600);
await photo(p, '12-dossier-etape1-rempli');
await suivant(p);
await choisir(p, 'roleImplicationId', 'principal').catch(() => choisir(p, 'roleImplicationId'));
await p.fill('[formcontrolname=fonctionOccupee]', 'Directrice financière').catch(() => {});
await pause(p, 500);
await photo(p, '13-dossier-etape2-implication');
await suivant(p);
await choisir(p, 'typeInfractionId', 'tournement').catch(() => choisir(p, 'typeInfractionId'));
await p.fill('[formcontrolname=montantPrejudice]', '25000000').catch(() => {});
await p.fill('[formcontrolname=dateFaits]', '12/03/2026').catch(() => {});
await p.fill('[formcontrolname=lieuPrecis]', 'Ouagadougou').catch(() => {});
await p.fill('[formcontrolname=description]', 'Surfacturation de fournitures de bureau sur trois marchés successifs.').catch(() => {});
await photo(p, '14-dossier-etape3-fait');
await p.getByRole('button', { name: /Ajouter ce fait/ }).click(); await pause(p, 700);
await photo(p, '15-dossier-etape3-fait-ajoute');
await suivant(p);
await photo(p, '16-dossier-etape4-recapitulatif');
const [rd] = await Promise.all([
  p.waitForResponse((r) => r.url().includes('/dossiers') && r.request().method() === 'POST'),
  p.getByRole('button', { name: /Enregistrer le dossier/ }).click()
]);
const dossier = await rd.json().catch(() => ({}));
const idDossier = dossier.dossierId ?? dossier.dossier?.id ?? dossier.id;
console.log('  dossier créé', idDossier);
await pause(p, 2500);

// --- la fiche du dossier
await p.goto(`http://localhost:4200/dossiers/${idDossier}`); await pause(p, 2500);
await photo(p, '17-fiche-dossier');
await p.getByRole('tab', { name: /Faits reprochés/ }).click(); await pause(p, 900);
await photo(p, '18-dossier-onglet-faits');

console.log(`IDS personne=${personne.id} dossier=${idDossier} numero=${personne.numeroPersonne}`);
await A.ctx.close(); await nav.close(); process.exit(0);
