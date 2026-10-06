import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => (inject(AuthService).pageAccueil().slice(1)) },

      // ---- Verification d'une personne precise : TOUS LES ROLES (seule porte d'entree d'un compte de consultation) ----
      {
        path: 'verification',
        loadComponent: () =>
          import('./features/verification/pages/verification-recherche/verification-recherche')
            .then((m) => m.VerificationRecherche)
      },
      {
        path: 'verification/mes-demandes',
        loadComponent: () =>
          import('./features/verification/pages/mes-demandes/mes-demandes').then((m) => m.MesDemandes)
      },
      {
        path: 'verification/personnes/:id',
        loadComponent: () =>
          import('./features/verification/pages/verification-fiche/verification-fiche')
            .then((m) => m.VerificationFiche)
      },

      // ---- Demandes d'export d'un dossier complet : ADMIN ----
      {
        path: 'demandes-export',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/verification/pages/demandes-export/demandes-export').then((m) => m.DemandesExport)
      },

      // ---- Registre Officiel (liste complete) : AGENT + VALIDATEUR + ADMIN. Un consultant passe par la verification. ----
      {
        path: 'registre-officiel',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/registre-officiel/pages/registre-officiel-liste/registre-officiel-liste')
            .then((m) => m.RegistreOfficielListe)
      },

      // ---- Tableau de bord : AGENT + VALIDATEUR + ADMIN ----
      {
        path: 'tableau-de-bord',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-vue/dashboard-vue').then((m) => m.DashboardVue)
      },

      // ---- Personnes : AGENT + ADMIN (creation/liste) ----
      {
        path: 'personnes',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/personnes/pages/personne-liste/personne-liste').then((m) => m.PersonneListe)
      },
      {
        path: 'personnes/recherche',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/personnes/pages/personne-recherche/personne-recherche').then((m) => m.PersonneRecherche)
      },
      {
        path: 'personnes/nouveau',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/personnes/pages/personne-creation/personne-creation').then((m) => m.PersonneCreation)
      },
      {
        path: 'personnes/:personneId/nouveau-dossier',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/dossiers/pages/creation-dossier/creation-dossier').then((m) => m.CreationDossier)
      },
      // Detail personne : consultable AUSSI par VALIDATEUR (depuis la validation)
      {
        path: 'personnes/:id',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/personnes/pages/personne-detail/personne-detail').then((m) => m.PersonneDetail)
      },

      // ---- Dossiers : AGENT + ADMIN (liste) ----
      {
        path: 'dossiers',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/dossiers/pages/dossier-liste/dossier-liste').then((m) => m.DossierListe)
      },
      // Detail dossier : consultable AUSSI par VALIDATEUR (depuis la validation)
      {
        path: 'dossiers/:id',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/dossiers/pages/dossier-detail/dossier-detail').then((m) => m.DossierDetail)
      },
      {
        path: 'personnes/:personneId/dossiers/nouveau',
        canActivate: [roleGuard('AGENT', 'ADMIN')],
        loadComponent: () =>
          import('./features/dossiers/pages/nouveau-dossier/nouveau-dossier').then((m) => m.NouveauDossier)
      },

      // ---- Validation : VALIDATEUR + ADMIN ----
      {
        path: 'validation',
        canActivate: [roleGuard('VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/validation/pages/validation-liste/validation-liste').then((m) => m.ValidationListe)
      },

      // ---- Rapports : AGENT + VALIDATEUR + ADMIN ----
      {
        path: 'rapports',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/rapports/rapports-page/rapports-page').then((m) => m.RapportsPage)
      },

      // ---- Etats trimestriels : VALIDATEUR + ADMIN ----
      {
        path: 'etats-trimestriels',
        canActivate: [roleGuard('VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/rapports/etats-trimestriels-page/etats-trimestriels-page').then((m) => m.EtatsTrimestrielsPage)
      },

      // ---- Documents : AGENT + VALIDATEUR + ADMIN ----
      {
        path: 'documents',
        canActivate: [roleGuard('AGENT', 'VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/documents/documents-page/documents-page').then((m) => m.DocumentsPage)
      },

      // ---- Audit : ADMIN uniquement ----
      {
        path: 'audit',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/audit/pages/audit-vue/audit-vue').then((m) => m.AuditVue)
      },

      // ---- Referentiels : ADMIN uniquement ----
      {
        path: 'referentiels',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/referentiels-hub/referentiels-hub').then((m) => m.ReferentielsHub)
      },
      {
        path: 'referentiels/categories-infraction',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/categories-infraction/categorie-infraction-liste/categorie-infraction-liste')
            .then((m) => m.CategorieInfractionListe)
      },
      {
        path: 'referentiels/types-infraction',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/types-infraction-page/types-infraction-page').then((m) => m.TypesInfractionPage)
      },
      {
        path: 'referentiels/statuts-judiciaires',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/statuts-judiciaires-page/statuts-judiciaires-page').then((m) => m.StatutsJudiciairesPage)
      },
      {
        path: 'referentiels/roles-implication',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/roles-implication-page/roles-implication-page').then((m) => m.RolesImplicationPage)
      },
      {
        path: 'referentiels/sources-signalement',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/sources-signalement-page/sources-signalement-page').then((m) => m.SourcesSignalementPage)
      },
      {
        path: 'referentiels/types-document',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/types-document-page/types-document-page').then((m) => m.TypesDocumentPage)
      },
      {
        path: 'referentiels/zones-geographiques',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/zones-geographiques-page/zones-geographiques-page').then((m) => m.ZonesGeographiquesPage)
      },
      // 🆕 Route des nationalités corrigée
      {
        path: 'referentiels/nationalites',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/nationalite-liste/nationalite-liste')
            .then((m) => m.NationaliteListe)
      },
      
     {
  path: 'referentiels/types-piece-identite',
  canActivate: [roleGuard('ADMIN')],
  loadComponent: () =>
    import('./features/referentiels/pages/type-piece-identite-liste/type-piece-identite-liste')
      .then((m) => m.TypePieceIdentiteListe)
},
      {
        path: 'referentiels/entites-organisation',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/referentiels/pages/entites-organisation-page/entites-organisation-page').then((m) => m.EntitesOrganisationPage)
      },

      // ---- Administration : ADMIN uniquement ----
      {
        path: 'administration',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/administration/administration-page/administration-page').then((m) => m.AdministrationPage)
      }
    ]
  },

  // Hors layout applicatif
  {
    path: 'acces-refuse',
    loadComponent: () => import('./shared/access-denied/access-denied').then((m) => m.AccessDenied)
  }
];
