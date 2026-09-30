import { PersonneDetailComplet } from './personne-detail.service';
import {
  DocumentResponse,
  FaitReprocheResponse,
  PersonneMoraleResponse,
  PersonnePhysiqueResponse
} from '../models/personne.models';

/** Champs historiques que l'API peut encore renvoyer selon la version (repli d'export). */
type FaitExport = FaitReprocheResponse & { lieuFaits?: string; lieuPrecis?: string; montantEstime?: number };
type DocumentExport = DocumentResponse & {
  titre?: string; dateAjout?: string; dateUpload?: string; nomFichier?: string; nomOriginal?: string;
};
type ValeurChamp = string | number | null | undefined;

/**
 * Utilitaires d'export côté client de la fiche personne complète.
 * Aucun appel back — les données proviennent du signal/state déjà chargé.
 */
export class PersonneExportUtil {

  static construireExport(donnees: PersonneDetailComplet, numeroFiche: string) {
    const d = donnees.detail;
    return {
      meta: {
        institut: 'ASCE-LC',
        libelle: 'Autorité Supérieure de Contrôle d\'État et de Lutte contre la Corruption',
        typeDocument: 'Export de fiche personne',
        numeroFiche,
        genereLe: new Date().toISOString(),
        version: '1.0'
      },
      personne: {
        id: donnees.resume.id,
        typePersonne: donnees.resume.typePersonne,
        nomAffichage: donnees.resume.nomAffichage,
        detail: d
      },
      dossiers: (donnees.dossiers || []).map(dos => ({
        id: dos.id,
        numeroDossier: dos.numeroDossier,
        intitule: dos.intitule,
        dateOuverture: dos.dateOuverture,
        statutDossier: dos.statutDossier
      })),
      implications: (donnees.implications || []).map((i) => ({
        id: i.id,
        dossierId: i.dossierId,
        role: i.roleImplicationLibelle,
        dateDebut: i.dateDebut,
        statutJudiciaire: i.statutJudiciaireLibelle,
        autoriteCompetente: i.autoriteCompetente,
        referenceAffaire: i.referenceAffaire
      })),
      faitsReproches: (donnees.faits || []).map((f: FaitExport) => ({
        id: f.id,
        typeInfraction: f.typeInfractionLibelle,
        dateFaits: f.dateFaits,
        lieuFaits: f.lieuFaits ?? f.lieuPrecis,
        description: f.description,
        montantEstime: f.montantEstime ?? f.montantPrejudice
      })),
      implicationFaits: donnees.implicationFaits ?? [],
      documents: (donnees.documents ?? []).map((doc: DocumentExport) => ({
        id: doc.id,
        typeDocument: doc.typeDocumentLibelle,
        titre: doc.titre ?? doc.nomOriginal,
        dateAjout: doc.dateAjout ?? doc.dateUpload,
        nomFichier: doc.nomFichier ?? doc.nomOriginal
      })),
      resumeChiffre: {
        nombreDossiers: donnees.dossiers?.length ?? 0,
        nombreImplications: donnees.implications?.length ?? 0,
        nombreFaits: donnees.faits?.length ?? 0,
        nombreDocuments: donnees.documents?.length ?? 0
      }
    };
  }

  /**
   * Télécharge la fiche en JSON côté client.
   */
  static telechargerJson(donnees: PersonneDetailComplet, numeroFiche: string): void {
    const payload = this.construireExport(donnees, numeroFiche);

    let json: string;
    try {
      json = JSON.stringify(payload, this.remplacerReferencesCirculaires(), 2);
    } catch (errStringify) {
      console.error('[PersonneExportUtil] Échec JSON.stringify', errStringify);
      throw new Error('Sérialisation JSON impossible (référence circulaire ?)');
    }

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const nom = `fiche-${numeroFiche.toLowerCase()}-${this.horodatage()}.json`;
    this.declencherTelechargement(blob, nom);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Export PDF via HTML Print
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Génère un PDF officiel de la fiche personne en construisant un HTML formaté
   * puis en déclenchant l'impression navigateur.
   */
  static telechargerPdf(donnees: PersonneDetailComplet, numeroFiche: string): void {
    const html = this.construireHtmlPdf(donnees, numeroFiche);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      throw new Error('Impossible d\'ouvrir le contexte d\'impression');
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }
    };
  }

  private static construireHtmlPdf(donnees: PersonneDetailComplet, numeroFiche: string): string {
    const d = donnees.detail;
    const isPhysique = donnees.resume.typePersonne === 'PHYSIQUE';
    const dateGeneration = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const infosPerso = isPhysique
      ? this.htmlInfosPhysique(d as PersonnePhysiqueResponse, donnees.resume.nomAffichage)
      : this.htmlInfosMorale(d as PersonneMoraleResponse);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche ${numeroFiche}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1D1D1B;
      font-size: 10pt;
      margin: 0;
      line-height: 1.4;
    }
    .header {
      border-bottom: 3px solid #257F3E;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-gauche h1 {
      font-size: 18pt;
      margin: 0;
      color: #257F3E;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-gauche .institut {
      font-size: 9pt;
      color: #57534E;
      margin-top: 2px;
    }
    .header-droite {
      text-align: right;
      font-size: 8.5pt;
      color: #57534E;
    }
    .numero-fiche {
      background: #257F3E;
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 4px;
    }
    h2 {
      font-size: 14pt;
      color: #257F3E;
      border-bottom: 2px solid #E7E5E4;
      padding-bottom: 4px;
      margin: 15px 0 10px 0;
    }
    h3 {
      font-size: 9.5pt;
      color: #44403C;
      margin: 14px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: #F5F5F4;
      text-align: left;
      padding: 6px 8px;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #57534E;
      border-bottom: 2px solid #E7E5E4;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #F5F5F4;
      vertical-align: top;
    }
    .grille-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      margin-bottom: 15px;
    }
    .champ {
      padding: 3px 0;
      border-bottom: 1px dotted #E7E5E4;
    }
    .champ-label {
      font-size: 7.5pt;
      color: #78716C;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
    }
    .champ-valeur {
      font-weight: 500;
      color: #1D1D1B;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: 600;
    }
    .badge-vert { background: #E6F4EA; color: #137333; }
    .badge-gris { background: #F1F3F4; color: #5F6368; }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 7.5pt;
      color: #A8A29E;
      border-top: 1px solid #E7E5E4;
      padding-top: 6px;
    }
    .empty {
      color: #A8A29E;
      font-style: italic;
      padding: 8px 0;
    }
    .resume-chiffres {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 12px 0;
    }
    .chiffre-carte {
      padding: 8px 12px;
      background: #F5F5F4;
      border-left: 3px solid #257F3E;
      border-radius: 3px;
    }
    .chiffre-nombre {
      font-size: 16pt;
      font-weight: bold;
      color: #257F3E;
      display: block;
      line-height: 1.2;
    }
    .chiffre-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #57534E;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-gauche">
      <h1>ASCE-LC</h1>
      <div class="institut">Autorité Supérieure de Contrôle d'État<br>et de Lutte contre la Corruption</div>
    </div>
    <div class="header-droite">
      <div class="numero-fiche">N° ${numeroFiche}</div><br>
      <span>Fiche officielle · ${isPhysique ? 'Personne physique' : 'Personne morale'}</span><br>
      <span>Générée le ${dateGeneration}</span>
    </div>
  </div>

  <h2>${this.escapeHtml(donnees.resume.nomAffichage)}</h2>

  <h3>Informations ${isPhysique ? 'personnelles' : 'de la personne morale'}</h3>
  <div class="grille-2col">
    ${infosPerso}
  </div>

  <h3>Résumé chiffré</h3>
  <div class="resume-chiffres">
    <div class="chiffre-carte">
      <span class="chiffre-nombre">${donnees.dossiers?.length ?? 0}</span>
      <span class="chiffre-label">Dossiers</span>
    </div>
    <div class="chiffre-carte">
      <span class="chiffre-nombre">${donnees.implications?.length ?? 0}</span>
      <span class="chiffre-label">Implications</span>
    </div>
    <div class="chiffre-carte">
      <span class="chiffre-nombre">${donnees.faits?.length ?? 0}</span>
      <span class="chiffre-label">Faits reprochés</span>
    </div>
    <div class="chiffre-carte">
      <span class="chiffre-nombre">${donnees.documents?.length ?? 0}</span>
      <span class="chiffre-label">Documents</span>
    </div>
  </div>

  <h3>Dossiers associés</h3>
  ${this.htmlTableDossiers(donnees)}

  <h3>Implications judiciaires</h3>
  ${this.htmlTableImplications(donnees)}

  <h3>Faits reprochés</h3>
  ${this.htmlTableFaits(donnees)}

  <div class="footer">
    Document confidentiel — Usage interne ASCE-LC · Fiche ${numeroFiche} · Généré le ${dateGeneration}
  </div>
</body>
</html>`;
  }

  private static htmlInfosPhysique(p: Partial<PersonnePhysiqueResponse> | undefined, nomDefaut?: string): string {
    const champ = (label: string, val: ValeurChamp) =>
      `<div class="champ"><span class="champ-label">${label}</span><span class="champ-valeur">${this.escapeHtml(val ?? '—')}</span></div>`;
    return `
      ${champ('Nom complet', p?.nomAffichage ?? nomDefaut)}
      ${champ('Date de naissance', p?.dateNaissance ? new Date(p.dateNaissance).toLocaleDateString('fr-FR') : null)}
      ${champ('Sexe', p?.sexe === 'M' ? 'Masculin' : p?.sexe === 'F' ? 'Féminin' : null)}
      ${champ('Lieu de naissance', p?.lieuNaissance)}
      ${champ('Nationalité', p?.nationalite)}
      ${champ('Situation matrimoniale', p?.situationMatrimoniale)}
      ${champ('Profession', p?.profession)}
      ${champ('Matricule FP', p?.matriculeFonctionPublique)}
      ${champ('Téléphone', p?.telephone)}
      ${champ('Adresse', p?.adresse)}
    `;
  }

  private static htmlInfosMorale(m: Partial<PersonneMoraleResponse> | undefined): string {
    const champ = (label: string, val: ValeurChamp) =>
      `<div class="champ"><span class="champ-label">${label}</span><span class="champ-valeur">${this.escapeHtml(val ?? '—')}</span></div>`;
    return `
      ${champ('Dénomination', m?.denominationSociale)}
      ${champ('Sigle', m?.sigle)}
      ${champ('Forme juridique', m?.formeJuridique)}
      ${champ('RCCM', m?.rccm)}
      ${champ('IFU', m?.ifu)}
      ${champ('Secteur d\'activité', m?.secteurActivite)}
      ${champ('Capital social', m?.capitalSocial ? new Intl.NumberFormat('fr').format(m.capitalSocial) + ' F CFA' : null)}
      ${champ('Téléphone', m?.telephone)}
      ${champ('Email', m?.email)}
      ${champ('Siège social', m?.siegeSocial)}
    `;
  }

  private static htmlTableDossiers(donnees: PersonneDetailComplet): string {
    if (!donnees.dossiers || donnees.dossiers.length === 0) {
      return '<div class="empty">Aucun dossier associé.</div>';
    }
    const rows = donnees.dossiers.map(dos => `
      <tr>
        <td><strong>${this.escapeHtml(dos.numeroDossier || '—')}</strong></td>
        <td>${this.escapeHtml(dos.intitule || 'Sans intitulé')}</td>
        <td>${dos.dateOuverture ? new Date(dos.dateOuverture).toLocaleDateString('fr-FR') : '—'}</td>
        <td>
          <span class="badge ${dos.statutDossier === 'OUVERT' ? 'badge-vert' : 'badge-gris'}">
            ${dos.statutDossier === 'OUVERT' ? 'En cours' : 'Clos'}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr><th>N° Dossier</th><th>Intitulé</th><th>Ouverture</th><th>Statut</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private static htmlTableImplications(donnees: PersonneDetailComplet): string {
    if (!donnees.implications || donnees.implications.length === 0) {
      return '<div class="empty">Aucune implication.</div>';
    }
    const rows = donnees.implications.map((i) => `
      <tr>
        <td>${this.escapeHtml(i.roleImplicationLibelle || '—')}</td>
        <td>${this.escapeHtml(i.entiteOrganisationLibelle || i.entiteLibelleALEpoque || '—')}</td>
        <td>${i.dateDebut ? new Date(i.dateDebut).toLocaleDateString('fr-FR') : '—'}</td>
        <td>${this.escapeHtml(i.statutJudiciaireLibelle || '—')}</td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr><th>Rôle</th><th>Entité</th><th>Date début</th><th>Statut judiciaire</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private static htmlTableFaits(donnees: PersonneDetailComplet): string {
    if (!donnees.faits || donnees.faits.length === 0) {
      return '<div class="empty">Aucun fait reproché.</div>';
    }
    const rows = donnees.faits.map((f) => `
      <tr>
        <td>${this.escapeHtml(f.typeInfractionLibelle || '—')}</td>
        <td>${f.dateFaits ? new Date(f.dateFaits).toLocaleDateString('fr-FR') : '—'}</td>
        <td>${this.escapeHtml(f.description || '—')}</td>
        <td style="text-align:right">${f.montantPrejudice ? new Intl.NumberFormat('fr-FR').format(f.montantPrejudice) + ' ' + (f.devise || 'XOF') : '—'}</td>
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr><th>Type d'infraction</th><th>Date</th><th>Description</th><th style="text-align:right">Préjudice</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Méthodes utilitaires privées
  // ─────────────────────────────────────────────────────────────────────────

  private static remplacerReferencesCirculaires() {
    const vus = new WeakSet<object>();
    return (_cle: string, valeur: unknown): unknown => {
      if (typeof valeur === 'object' && valeur !== null) {
        if (vus.has(valeur as object)) return '[Circular]';
        vus.add(valeur as object);
      }
      return valeur;
    };
  }

  private static horodatage(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  private static declencherTelechargement(blob: Blob, nom: string): void {
    if (typeof document === 'undefined' || !document.body) {
      throw new Error('DOM inaccessible pour le téléchargement');
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  private static escapeHtml(txt: unknown): string {
    if (txt === null || txt === undefined) return '—';
    return String(txt)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
