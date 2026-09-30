// Parcours metier complementaires (un scenario a la fois, pour limiter la memoire du navigateur) :
//   SCENARIOS=documents,peine,rejet,morale,statut,modifier,exports,referentiel,admin   (usage : voir ui-check.mjs)
//   documents   : depot d'un PDF valide (HTTP 201) et refus d'un .exe (HTTP 400)
//   peine       : le validateur valide le fait, puis l'agent saisit une peine (proposee seulement sur un fait valide)
//   rejet       : le validateur rejette un fait avec un motif ; visible dans l'onglet Rejetes ; l'agent n'a pas acces a la validation
//   morale      : creation d'une personne morale (assistant), retrouvee par la recherche
//   statut      : changement de statut judiciaire (autorite, reference, motif), visible en-tete et historique
//   modifier    : modification de la fiche d'une personne
//   exports     : PDF du dossier, registre officiel (PDF), liste des dossiers et personnes recensees (Excel) telecharges
//   referentiel : creation puis suppression (avec confirmation) d'une categorie d'infraction
//   admin       : regle des 12 caracteres du mot de passe, generation, creation d'un utilisateur — le supprimer ensuite
// Parcours metier complementaires dans un vrai navigateur. Un scenario a la fois : SCENARIOS=documents,peine,rejet,morale,admin
import { chromium } from 'playwright';
import net from 'net';
import fs from 'fs';

for (const port of [4200, 8180, 8080]) {
  net.createServer((c) => { const s = net.connect(port, 'host.docker.internal'); c.pipe(s); s.pipe(c); c.on('error', () => s.destroy()); s.on('error', () => c.destroy()); }).listen(port, '127.0.0.1');
}
const PW = process.env.UI_PASSWORD;
const scenarios = (process.env.SCENARIOS || 'documents,peine,rejet,morale,admin').split(',');
const resultats = [];
const ok = (etape, cond, detail = '') => { resultats.push({ etape, ok: !!cond, detail }); console.log(`${cond ? '[OK]    ' : '[ECHEC] '}${etape}${detail ? ' — ' + detail : ''}`); };
const nav = await chromium.launch();

async function session(utilisateur) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 1000 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const requetes = []; const erreurs = [];
  page.on('response', (r) => { if (r.url().includes('/api/v1') && r.request().method() !== 'GET') requetes.push({ m: r.request().method(), u: r.url().replace(/.*\/api\/v1/, ''), s: r.status() }); });
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('login-status-iframe') && !m.text().includes('status of 4')) erreurs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => erreurs.push(String(e).slice(0, 140)));
  await page.goto('http://localhost:4200');
  await page.waitForURL(/8180.*openid-connect\/auth/);
  await page.fill('#username', utilisateur); await page.fill('#password', PW); await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/); await page.locator('app-topbar').waitFor({ timeout: 30000 });
  return { ctx, page, requetes, erreurs };
}
const pause = (page, ms = 600) => page.waitForTimeout(ms);
const choisir = async (page, nom, texte, portee) => {
  const champ = page.locator(`mat-dialog-container [formcontrolname=${nom}], main [formcontrolname=${nom}]`).first();
  await champ.click({ timeout: 8000 }).catch(async () => { await page.screenshot({ path: `/out/flow2-choisir-${nom}.png` }); await champ.click({ force: true }); });
  await (texte ? page.locator('mat-option', { hasText: new RegExp(texte, 'i') }).first() : page.locator('mat-option').first()).click();
  await pause(page, 150);
};
const suivant = async (page) => { await page.getByRole('button', { name: /Suivant/ }).click(); await pause(page, 700); };
async function etat(page, titre) {
  const l = await page.evaluate(() => [...document.querySelectorAll('mat-dialog-container input, mat-dialog-container textarea, mat-dialog-container mat-select, mat-dialog-container button, main input, main button')].filter((e) => e.getBoundingClientRect().width || e.type === 'file').map((e) => `${e.tagName.toLowerCase()}|${e.getAttribute('formcontrolname') || e.type || ''}|${(e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}`).slice(0, 40));
  console.log(`   [diagnostic ${titre}] ` + l.join(' ; '));
  await page.screenshot({ path: `/out/flow2-diag-${titre}.png` });
}

/** L'agent cree une personne puis ouvre un dossier avec un fait : renvoie { nom, id }. */
async function creerPersonneEtDossier(nomPrefixe) {
  const NOM = nomPrefixe + Date.now().toString().slice(-7);
  const { ctx, page, requetes } = await session('agent.test');
  await page.goto('http://localhost:4200/personnes/nouveau'); await pause(page, 1200);
  await page.fill('[formcontrolname=nomNaissance]', NOM); await page.fill('[formcontrolname=prenoms]', 'Test');
  await page.fill('[formcontrolname=dateNaissance]', '02/03/1975');
  await suivant(page); await suivant(page);
  const [rep] = await Promise.all([page.waitForResponse((r) => r.url().includes('/personnes/physiques') && r.request().method() === 'POST'), page.getByRole('button', { name: /^Enregistrer$/ }).click()]);
  const id = (await rep.json()).id; await pause(page, 800);
  await page.goto(`http://localhost:4200/personnes/${id}/dossiers/nouveau`); await pause(page, 1200);
  await page.fill('[formcontrolname=intitule]', 'Dossier ' + NOM); await choisir(page, 'sourceSignalementId'); await suivant(page);
  await choisir(page, 'roleImplicationId'); await suivant(page);
  await choisir(page, 'typeInfractionId'); await page.fill('[formcontrolname=montantPrejudice]', '5000000');
  await page.fill('[formcontrolname=dateFaits]', '10/05/2026'); await page.fill('[formcontrolname=description]', 'Fait de test ' + NOM);
  await page.getByRole('button', { name: /Ajouter ce fait/ }).click(); await pause(page, 500); await suivant(page);
  const [rd] = await Promise.all([page.waitForResponse((r) => r.url().includes('/dossiers') && r.request().method() === 'POST'), page.getByRole('button', { name: /Enregistrer le dossier/ }).click()]);
  const dossier = await rd.json().catch(() => ({}));
  await pause(page, 1200); await ctx.close();
  return { NOM, id, dossierId: dossier.dossierId || dossier.id };
}

/** Le validateur valide le fait du dossier "Dossier <NOM>" depuis l'ecran de validation. */
async function validerViaInterface(NOM) {
  const { ctx, page, requetes } = await session('validateur.test');
  await page.goto('http://localhost:4200/validation'); await pause(page, 1200);
  await page.locator('main input').first().fill(NOM); await pause(page, 900);
  if ((await page.getByRole('button', { name: /Tout valider/ }).count()) === 0) { await page.getByText('Dossier ' + NOM).first().click(); await pause(page, 700); }
  await page.getByRole('button', { name: /Tout valider/ }).first().click(); await pause(page, 800);
  await page.locator('mat-dialog-container').getByRole('button', { name: /valider|Confirmer/i }).last().click(); await pause(page, 1500);
  const put = requetes.find((r) => r.m === 'PUT' && /\/valider/.test(r.u));
  await ctx.close();
  return put && put.s === 200;
}

const cible = {};
async function fixture(nom) { if (!cible[nom]) cible[nom] = await creerPersonneEtDossier(nom); return cible[nom]; }

const lancer = {
  async documents() {
    console.log('\n== Documents');
    const { NOM, id } = await fixture('UiDoc');
    const { ctx, page, requetes, erreurs } = await session('agent.test');
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1000);
    await page.getByRole('tab', { name: /Dossiers/ }).click(); await pause(page, 600);
    await page.locator('main .btn-icone-mini').nth(2).click().catch(() => {}); // ouvre le dossier (peut ouvrir un onglet)
    const dossierUrl = await page.evaluate(() => [...document.querySelectorAll('a[href*="/dossiers/"]')].map((a) => a.getAttribute('href'))[0]);
    await page.goto('http://localhost:4200' + (dossierUrl || '/dossiers')); await pause(page, 1000);
    if (!dossierUrl) { await page.locator('tr', { hasText: NOM }).getByRole('button').last().click(); await pause(page, 1000); }
    await page.getByRole('tab', { name: /Documents/ }).click(); await pause(page, 600);
    await page.getByRole('button', { name: /Ajouter (des|le premier) documents?/ }).first().click(); await pause(page, 800);
    await page.screenshot({ path: '/out/flow2-doc-01-dialogue.png' });
    const fichier = async (nomFichier, contenu) => { fs.writeFileSync('/tmp/' + nomFichier, contenu); await page.locator('input[type=file]').setInputFiles('/tmp/' + nomFichier); await pause(page, 500); };
    // 1. fichier valide
    await fichier('piece-navigateur.pdf', '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
    { const sel = page.locator('mat-dialog-container mat-select').first(); await sel.click(); await page.locator('mat-option').first().click(); await pause(page, 200); }
    await page.screenshot({ path: '/out/flow2-doc-02-rempli.png' });
    requetes.length = 0;
    await page.getByRole('button', { name: /Enregistrer et sceller/ }).click(); await pause(page, 2000);
    const upload = requetes.find((r) => r.m === 'POST' && /\/documents/.test(r.u));
    ok('AGENT depose un PDF valide (Enregistrer et sceller)', upload && upload.s === 201, upload ? `HTTP ${upload.s}` : (await etat(page, 'doc-upload'), 'aucune requete'));
    await page.screenshot({ path: '/out/flow2-doc-03-apres.png' });
    const texte = await page.locator('body').innerText();
    ok('le document apparait dans le dossier avec son empreinte', /piece-navigateur\.pdf/.test(texte), texte.includes('SHA') ? 'empreinte affichee' : '');
    // 2. fichier dangereux
    await page.getByRole('button', { name: /Ajouter (des|le premier) documents?/ }).first().click().catch(() => {});
    await pause(page, 700);
    await fichier('malware.exe', 'MZ contenu executable');
    { const sel = page.locator('mat-dialog-container mat-select').first(); await sel.click(); await page.locator('mat-option').first().click(); await pause(page, 200); }
    requetes.length = 0;
    await page.getByRole('button', { name: /Enregistrer et sceller/ }).click().catch(() => {}); await pause(page, 1800);
    const refus = requetes.find((r) => r.m === 'POST' && /\/documents/.test(r.u));
    const messages = (await page.locator('.toast-message, .toast-error, mat-error, .mat-mdc-snack-bar-label').allInnerTexts()).join(' | ');
    ok('un fichier .exe est refuse (par le serveur ou par le formulaire)', (refus && refus.s === 400) || (!refus && /extension|autoris|invalide/i.test(messages)), refus ? `HTTP ${refus.s}` : `message: ${messages.slice(0, 90)}`);
    await page.screenshot({ path: '/out/flow2-doc-04-refus.png' });
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async peine() {
    console.log('\n== Peine');
    const { NOM, id } = await fixture('UiPeine');
    ok('prealable : le VALIDATEUR valide le fait (une peine ne se saisit que sur un fait valide)', await validerViaInterface(NOM));
    const { ctx, page, requetes, erreurs } = await session('agent.test');
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1000);
    await page.getByRole('tab', { name: /Dossiers/ }).click(); await pause(page, 700);
    console.log('   boutons d\'action visibles :', await page.locator('main .btn-icone-mini').count());
    await page.locator('main .btn-icone-mini').last().click(); await pause(page, 900);
    await page.screenshot({ path: '/out/flow2-peine-00-menu.png' });
    console.log('   elements de menu :', (await page.getByRole('menuitem').allInnerTexts()).join(' | ') || '(aucun)');
    await page.getByRole('menuitem', { name: /Ajouter une peine/ }).click();
    await page.locator('mat-dialog-container').waitFor(); await pause(page, 1500);
    await page.screenshot({ path: '/out/flow2-peine-00b-dialogue.png' });
    await choisir(page, 'typePeine', 'Amende');
    await page.fill('[formcontrolname=montantAmende]', '2000000');
    await page.fill('[formcontrolname=dateDecision]', '20/08/2026');
    await page.fill('[formcontrolname=description]', 'Amende prononcee (test navigateur)');
    await page.screenshot({ path: '/out/flow2-peine-01-rempli.png' });
    requetes.length = 0;
    await page.getByRole('button', { name: /Enregistrer la peine/ }).click(); await pause(page, 1800);
    const p = requetes.find((r) => r.m === 'POST' && /\/peines/.test(r.u));
    ok('AGENT enregistre une peine', p && p.s === 201, p ? `HTTP ${p.s}` : (await etat(page, 'peine'), 'aucune requete'));
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1200);
    await page.getByRole('tab', { name: /Peines/ }).click(); await pause(page, 700);
    await page.screenshot({ path: '/out/flow2-peine-02-onglet.png' });
    const texte = await page.locator('body').innerText();
    ok('la peine apparait dans l\'onglet Peines & sanctions', /Amende|2\s?000\s?000/.test(texte) && /Peines & sanctions \(1\)/.test(texte));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async rejet() {
    console.log('\n== Rejet d\'un fait');
    const { NOM } = await fixture('UiRejet');
    const val = await session('validateur.test');
    let page = val.page;
    await page.goto('http://localhost:4200/validation'); await pause(page, 1200);
    await page.locator('main input').first().fill(NOM); await pause(page, 900);
    if ((await page.locator('main table').count()) === 0) { await page.getByText('Dossier ' + NOM).first().click(); await pause(page, 700); }
    await page.screenshot({ path: '/out/flow2-rejet-01-liste.png' });
    val.requetes.length = 0;
    await page.locator('main table tbody tr').first().locator('button').last().click(); await pause(page, 900);
    await page.screenshot({ path: '/out/flow2-rejet-02-dialogue.png' });
    const champ = page.locator('mat-dialog-container textarea, mat-dialog-container input').first();
    if (await champ.count()) await champ.fill('Pieces justificatives insuffisantes (test navigateur)');
    else await etat(page, 'rejet-dialogue');
    await page.locator('mat-dialog-container').getByRole('button', { name: /Rejeter|Confirmer|Valider/i }).last().click(); await pause(page, 1500);
    const rej = val.requetes.find((r) => r.m === 'PUT' && /\/rejeter/.test(r.u));
    ok('VALIDATEUR rejette le fait avec un motif', rej && rej.s === 200, rej ? `HTTP ${rej.s}` : 'aucune requete');
    await page.goto('http://localhost:4200/validation'); await pause(page, 1000);
    await page.getByRole('tab', { name: /Rejet/ }).click(); await pause(page, 900);
    await page.screenshot({ path: '/out/flow2-rejet-03-onglet-rejetes.png' });
    ok('le fait apparait dans l\'onglet Rejetes avec son motif', (await page.locator('body').innerText()).includes('Pieces justificatives insuffisantes'));
    ok('aucune erreur JavaScript cote validateur', val.erreurs.length === 0, val.erreurs.slice(0, 2).join(' | '));
    await val.ctx.close();
    // L'agent peut reprendre le fait rejete
    const ag = await session('agent.test'); page = ag.page;
    await page.goto('http://localhost:4200/validation').catch(() => {}); await pause(page, 800);
    ok('AGENT n\'a pas acces a l\'ecran de validation', !page.url().includes('/validation'), page.url().replace('http://localhost:4200', ''));
    await ag.ctx.close();
  },

  async morale() {
    console.log('\n== Personne morale');
    const NOM = 'UiSociete' + Date.now().toString().slice(-6);
    const { ctx, page, requetes, erreurs } = await session('agent.test');
    await page.goto('http://localhost:4200/personnes/nouveau'); await pause(page, 1200);
    await page.getByRole('button', { name: /Personne morale/ }).click(); await pause(page, 600);
    await page.fill('[formcontrolname=denominationSociale]', NOM);
    await page.fill('[formcontrolname=sigle]', 'UIS');
    await page.fill('[formcontrolname=formeJuridique]', 'SARL');
    await page.fill('[formcontrolname=secteurActivite]', 'Travaux publics');
    await page.fill('[formcontrolname=siegeSocial]', 'Ouagadougou, secteur 15');
    await page.fill('[formcontrolname=dateCreationEntreprise]', '15/01/2010');
    await page.screenshot({ path: '/out/flow2-morale-01.png' });
    await suivant(page);
    await page.screenshot({ path: '/out/flow2-morale-02.png' });
    requetes.length = 0;
    let n = 0;
    while ((await page.getByRole('button', { name: /^Suivant/ }).count()) && n++ < 3) await suivant(page);
    const enregistrer = page.getByRole('button', { name: /^Enregistrer$/ });
    if (await enregistrer.count()) await enregistrer.click(); else await etat(page, 'morale');
    await pause(page, 1800);
    const m = requetes.find((r) => r.m === 'POST' && /\/personnes\/morales/.test(r.u));
    ok('AGENT cree une personne morale', m && m.s === 201, m ? `HTTP ${m.s}` : 'aucune requete');
    await page.goto('http://localhost:4200/personnes'); await pause(page, 1200);
    await page.locator('main input').first().fill(NOM); await pause(page, 1500); // liste paginee : recherche par nom
    ok('la societe apparait dans la liste d\'identification (recherche par nom)', (await page.locator('body').innerText()).includes(NOM));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async statut() {
    console.log('\n== Statut judiciaire');
    const { NOM, id } = await fixture('UiStatut');
    ok('prealable : le fait est valide', await validerViaInterface(NOM));
    const { ctx, page, requetes, erreurs } = await session('agent.test');
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1500);
    await page.locator('.btn-modifier-statut').first().click(); await page.locator('mat-dialog-container').waitFor(); await pause(page, 1200);
    await choisir(page, 'statutJudiciaireId', 'Inculpation');
    await page.fill('[formcontrolname=dateStatut]', '25/09/2026');
    await page.fill('[formcontrolname=autoriteCompetente]', 'Tribunal de grande instance de Ouagadougou');
    await page.fill('[formcontrolname=referenceAffaire]', 'RG-2026-123');
    await page.fill('[formcontrolname=motif]', 'Ouverture d\'une information judiciaire (test navigateur)');
    await page.screenshot({ path: '/out/flow2-statut-01-rempli.png' });
    requetes.length = 0;
    await page.getByRole('button', { name: /Enregistrer le nouveau statut/ }).click(); await pause(page, 2000);
    const put = requetes.find((r) => r.m === 'PUT' && /\/statut/.test(r.u));
    ok('AGENT enregistre le nouveau statut judiciaire', put && put.s === 200, put ? `HTTP ${put.s}` : (await etat(page, 'statut'), 'aucune requete'));
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1500);
    ok('la fiche affiche le nouveau statut (en-tete)', /inculpation/i.test(await page.locator('body').innerText())); // libelle mis en majuscules par le CSS
    await page.getByRole('tab', { name: /Historique/ }).click(); await pause(page, 900);
    await page.screenshot({ path: '/out/flow2-statut-02-historique.png' });
    const histo = await page.locator('body').innerText();
    ok('l\'historique des statuts trace le changement (statut, autorite et reference)', /inculpation/i.test(histo) && /Tribunal de grande instance/i.test(histo) && /RG-2026-123/.test(histo),
      `statut:${/inculpation/i.test(histo)} autorite:${/Tribunal de grande instance/i.test(histo)} reference:${/RG-2026-123/.test(histo)}`);
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async modifier() {
    console.log('\n== Modification d\'une fiche');
    const { NOM, id } = await fixture('UiModif');
    const { ctx, page, requetes, erreurs } = await session('agent.test');
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1500);
    await page.getByRole('button', { name: /^Actions$/ }).first().click(); await pause(page, 500);
    await page.getByRole('menuitem', { name: /Modifier la fiche/ }).click();
    await page.locator('mat-dialog-container').waitFor(); await pause(page, 1200);
    await page.fill('[formcontrolname=lieuNaissance]', 'Bobo-Dioulasso');
    await page.screenshot({ path: '/out/flow2-modif-01.png' });
    requetes.length = 0;
    await page.locator('mat-dialog-container').getByRole('button', { name: /Enregistrer|Modifier|Mettre/i }).last().click(); await pause(page, 2000);
    const put = requetes.find((r) => r.m === 'PUT' && /\/personnes\/physiques/.test(r.u));
    ok('AGENT modifie la fiche (lieu de naissance)', put && put.s === 200, put ? `HTTP ${put.s}` : (await etat(page, 'modif'), 'aucune requete'));
    await page.goto(`http://localhost:4200/personnes/${id}`); await pause(page, 1500);
    ok('la fiche affiche la nouvelle valeur', /Bobo-Dioulasso/.test(await page.locator('body').innerText()));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async exports() {
    console.log('\n== Exports (PDF et Excel) depuis l\'interface');
    const { NOM, id, dossierId } = await fixture('UiExport');
    const { ctx, page, erreurs } = await session('agent.test');
    const telecharger = async (declencheur) => {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), declencheur()]);
      const chemin = '/tmp/' + dl.suggestedFilename(); await dl.saveAs(chemin);
      return { nom: dl.suggestedFilename(), debut: fs.readFileSync(chemin).subarray(0, 4).toString('latin1'), taille: fs.statSync(chemin).size };
    };
    // PDF du dossier depuis la fiche du dossier
    await page.goto(`http://localhost:4200/dossiers/${dossierId}`); await pause(page, 1500);
    const pdf = await telecharger(() => page.getByRole('button', { name: /^PDF$/ }).first().click()).catch((e) => ({ erreur: e.message.split('\n')[0] }));
    ok('le PDF du dossier se telecharge depuis la fiche du dossier', pdf.debut === '%PDF' && pdf.taille > 500, JSON.stringify(pdf));
    // Ecran des rapports
    await page.goto('http://localhost:4200/rapports'); await pause(page, 1500);
    await page.screenshot({ path: '/out/flow2-exports-01-rapports.png' });
    const boutons = (await page.locator('main button').allInnerTexts()).map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
    console.log('   boutons de l\'ecran Rapports :', boutons.join(' | '));
    const carte = (titre) => page.locator("main div").filter({ has: page.getByText(titre, { exact: true }) }).filter({ has: page.getByRole("button") }).last();
    const registre = await telecharger(() => carte("Registre officiel").getByRole("button", { name: /Télécharger/ }).click()).catch((e) => ({ erreur: e.message.split('\n')[0] }));
    ok("export du registre officiel (PDF) depuis l'ecran Rapports", registre.debut === "%PDF" && /.pdf$/i.test(registre.nom || "") && registre.taille > 500, JSON.stringify(registre));
    const dossiers = await telecharger(() => carte("Liste des dossiers").getByRole("button", { name: /Télécharger/ }).click()).catch((e) => ({ erreur: e.message.split('\n')[0] }));
    ok("export de la liste des dossiers (Excel) depuis l'ecran Rapports", dossiers.debut === "PK" && /.xlsx$/i.test(dossiers.nom || "") && dossiers.taille > 1000, JSON.stringify(dossiers));
    await carte("Personnes recensées").getByRole("button", { name: /Configurer/ }).click(); await pause(page, 700);
    await page.screenshot({ path: "/out/flow2-exports-02-configurer-personnes.png" });
    await page.locator("main input").filter({ hasNot: page.locator("nothing") }).nth(1).fill(NOM).catch(() => {});
    const personnes = await telecharger(() => page.getByRole("button", { name: /Télécharger l.Excel/ }).click()).catch((e) => ({ erreur: e.message.split('\n')[0] }));
    ok("export des personnes recensees (Excel) apres configuration", personnes.debut === "PK" && /.xlsx$/i.test(personnes.nom || "") && personnes.taille > 1000, JSON.stringify(personnes));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async referentiel() {
    console.log('\n== Referentiel : creation puis suppression (ADMIN)');
    const LIBELLE = 'Categorie UI ' + Date.now().toString().slice(-6);
    const { ctx, page, requetes, erreurs } = await session('admin.test');
    await page.goto('http://localhost:4200/referentiels/categories-infraction'); await pause(page, 1500);
    await page.getByRole('button', { name: /Ajouter|Nouvelle|Cr[ée]er/i }).first().click(); await pause(page, 900);
    await page.locator('mat-dialog-container input').first().fill(LIBELLE);
    requetes.length = 0;
    await page.locator('mat-dialog-container').getByRole('button', { name: /Enregistrer|Cr[ée]er|Ajouter/i }).last().click(); await pause(page, 1500);
    const post = requetes.find((r) => r.m === 'POST' && /categories-infraction/.test(r.u));
    ok('ADMIN cree une categorie d\'infraction', post && post.s === 201, post ? `HTTP ${post.s}` : (await etat(page, 'referentiel'), 'aucune requete'));
    await page.goto('http://localhost:4200/referentiels/categories-infraction'); await pause(page, 1500);
    const ligne = page.locator('tr, mat-card, li', { hasText: LIBELLE }).first();
    ok('la categorie apparait dans la liste', (await ligne.count()) > 0);
    requetes.length = 0;
    await ligne.getByRole('button', { name: /Supprimer/ }).click(); await pause(page, 800);
    await page.screenshot({ path: '/out/flow2-referentiel-01-confirmation.png' });
    await page.locator('mat-dialog-container').getByRole('button', { name: /Supprimer|Confirmer|Oui/i }).last().click(); await pause(page, 1500);
    const del = requetes.find((r) => r.m === 'DELETE' && /categories-infraction/.test(r.u));
    ok('la suppression demande confirmation puis reussit', del && del.s === 204, del ? `HTTP ${del.s}` : 'aucune requete');
    await page.goto('http://localhost:4200/referentiels/categories-infraction'); await pause(page, 1500);
    ok('la categorie a disparu de la liste', !(await page.locator('body').innerText()).includes(LIBELLE));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    await ctx.close();
  },

  async admin() {
    console.log('\n== Administration des utilisateurs');
    const LOGIN = 'ui.utilisateur' + Date.now().toString().slice(-5);
    const { ctx, page, requetes, erreurs } = await session('admin.test');
    await page.goto('http://localhost:4200/administration'); await pause(page, 1500);
    await page.screenshot({ path: '/out/flow2-admin-01.png' });
    const lignesAvant = await page.locator('main table tbody tr').count();
    await page.getByRole('button', { name: /Cr[ée]er|Nouvel|Ajouter/i }).first().click(); await pause(page, 900);
    await page.screenshot({ path: '/out/flow2-admin-02-dialogue.png' });
    await etat(page, 'admin-dialogue');
    const remplir = async (nom, valeur) => { const c = page.locator(`mat-dialog-container [formcontrolname=${nom}]`); if (await c.count()) await c.fill(valeur); };
    await remplir('nom', 'Ouedraogo'); await remplir('prenom', 'Salif'); await remplir('email', LOGIN + '@asce-lc.bf'); await remplir('telephone', '70000000');
    await choisir(page, 'roleInitial', 'Agent');
    // Regle : mot de passe de 12 caracteres minimum (majuscule, minuscule, chiffre)
    const champMdp = page.locator('mat-dialog-container [formcontrolname=motDePasseTemporaire]');
    const boutonCreer = page.locator('mat-dialog-container').getByRole('button', { name: /Cr[ée]er l'utilisateur/ });
    await champMdp.fill('Abcdefg1234'); await champMdp.blur(); await pause(page, 400);          // 11 caracteres
    ok('un mot de passe de 11 caracteres est refuse (bouton desactive)', await boutonCreer.isDisabled());
    ok('le message rappelle la regle des 12 caracteres', /12 caract/.test(await page.locator('mat-dialog-container').innerText()));
    await champMdp.fill('abcdefghijkl1'); await pause(page, 300);                               // 13 sans majuscule
    ok('un mot de passe sans majuscule est refuse', await boutonCreer.isDisabled());
    await champMdp.fill('Abcdefgh1234'); await pause(page, 300);                                // exactement 12
    ok('un mot de passe de 12 caracteres conforme est accepte', await boutonCreer.isEnabled());
    await page.locator('mat-dialog-container').getByRole('button', { name: /^G[ée]n[ée]rer/ }).click(); await pause(page, 500);
    const mdp = await page.locator('mat-dialog-container [formcontrolname=motDePasseTemporaire]').inputValue();
    ok('un mot de passe temporaire robuste est genere (12+ caracteres)', mdp.length >= 12, `${mdp.length} caracteres`);
    await page.screenshot({ path: '/out/flow2-admin-02b-rempli.png' });
    requetes.length = 0;
    await page.locator('mat-dialog-container').getByRole('button', { name: /Cr[ée]er l'utilisateur/ }).click(); await pause(page, 4000);
    const c = requetes.find((r) => r.m === 'POST' && /\/utilisateurs/.test(r.u));
    ok('ADMIN cree un utilisateur (Keycloak + base)', c && c.s === 201, c ? `HTTP ${c.s}` : 'aucune requete');
    await page.screenshot({ path: '/out/flow2-admin-03-apres.png' });
    await page.goto('http://localhost:4200/administration'); await pause(page, 1500);
    ok('l\'utilisateur apparait dans la liste', (await page.locator('body').innerText()).includes(LOGIN), `${lignesAvant} -> ${await page.locator('main table tbody tr').count()} lignes`);
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
    fs.writeFileSync('/out/flow2-utilisateur-cree.txt', LOGIN + '@asce-lc.bf');
    await ctx.close();
  }
};

for (const nom of scenarios) {
  try { await lancer[nom](); } catch (e) { ok(`scenario ${nom} interrompu`, false, String(e.message).split('\n').slice(0, 4).join(' / ').slice(0, 340)); }
}
await nav.close();
fs.writeFileSync('/out/flow2-resultats.json', JSON.stringify(resultats, null, 2));
console.log(`\n${resultats.filter((r) => r.ok).length}/${resultats.length} etapes reussies`);
process.exit(resultats.every((r) => r.ok) ? 0 : 1);
