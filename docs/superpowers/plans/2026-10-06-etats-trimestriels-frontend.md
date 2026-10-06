# Etats trimestriels - Plan d'implementation (frontend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page « Etats trimestriels » ou l'administrateur et le validateur listent les etats archives, les telechargent en PDF/Excel, et l'administrateur genere un etat a la demande.

**Architecture:** Un service HTTP (`EtatTrimestrielService`) qui appelle `/api/v1/rapports/etats-trimestriels`, une page standalone avec signaux (comme `RapportsPage`), une route protegee par `roleGuard('VALIDATEUR','ADMIN')` et une entree de menu.

**Tech Stack:** Angular 21 (standalone, signals), Angular Material, ngx-toastr, lucide-angular, Vitest (`ng test`).

**Spec:** `../logintegrite_backend/docs/superpowers/specs/2026-10-06-etat-trimestriel-design.md` (plan backend: `../logintegrite_backend/docs/superpowers/plans/2026-10-06-etat-trimestriel.md`, a deployer avant ce plan).

## Global Constraints
- Dates affichees en `jj/mm/aaaa` (convention deja adoptee dans l'application).
- Textes de l'interface en francais avec accents; identifiants de code en francais sans accents comme l'existant.
- Reutiliser `RapportService.telecharger(blob, nom)` pour les telechargements.
- Lecture reservee a VALIDATEUR et ADMIN; le bouton « Generer maintenant » n'est affiche qu'a l'ADMIN (`AuthService.hasRole('ADMIN')`). Le serveur reste l'autorite (403 sinon).
- Les messages d'erreur du serveur (ex. limite de 3 regenerations) sont affiches tels quels dans un toast.

## Review Focus
- Liste vide (aucun etat archive) : message explicite, pas de tableau vide.
- Etat « remplace » : visible mais clairement marque, et le telechargement reste possible.
- Echec reseau ou 403 au chargement : message d'erreur, pas de page blanche.
- Double clic sur « Generer » : un seul appel (bouton desactive pendant la generation).
- Trimestres proposes : uniquement des trimestres termines (jamais le trimestre en cours), changement d'annee compris (en janvier, le dernier est T4 de l'annee precedente).

---

### Task 1: Modele, service HTTP et liste des trimestres termines

**Files:**
- Create: `src/app/features/rapports/models/etat-trimestriel.models.ts`
- Create: `src/app/features/rapports/services/etat-trimestriel.service.ts`
- Test: `src/app/features/rapports/services/etat-trimestriel.service.spec.ts`

**Interfaces:**
- Produces:
  - `interface EtatTrimestrielResume { id: string; annee: number; trimestre: number; dateArret: string; dateGeneration: string; generePar: string; nbPersonnes: number; sha256Pdf: string; sha256Excel: string; remplace: boolean }`
  - `interface TrimestreOption { annee: number; trimestre: number; libelle: string }`
  - `EtatTrimestrielService`: `lister(): Observable<EtatTrimestrielResume[]>`, `pdf(id: string): Observable<Blob>`, `excel(id: string): Observable<Blob>`, `generer(annee: number, trimestre: number): Observable<void>`
  - `trimestresTermines(aujourdhui: Date, nombre: number): TrimestreOption[]` (le plus recent d'abord, le trimestre en cours exclu)
  - `libelleTrimestre(annee: number, trimestre: number): string` (« T3 2026 »)

- [ ] **Step 1: Ecrire le test qui echoue**

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { EtatTrimestrielService, libelleTrimestre, trimestresTermines } from './etat-trimestriel.service';

describe('EtatTrimestrielService', () => {
  let service: EtatTrimestrielService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/rapports/etats-trimestriels`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EtatTrimestrielService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('liste les etats archives', () => {
    let recu: unknown;
    service.lister().subscribe(r => (recu = r));
    http.expectOne(base).flush([{ id: 'a', annee: 2026, trimestre: 3 }]);
    expect(recu).toEqual([{ id: 'a', annee: 2026, trimestre: 3 }]);
  });

  it('telecharge le PDF et l\'Excel en blob', () => {
    service.pdf('a').subscribe();
    const r1 = http.expectOne(`${base}/a/pdf`);
    expect(r1.request.responseType).toBe('blob');
    r1.flush(new Blob());
    service.excel('a').subscribe();
    const r2 = http.expectOne(`${base}/a/excel`);
    expect(r2.request.responseType).toBe('blob');
    r2.flush(new Blob());
  });

  it('genere un etat avec annee et trimestre en parametres', () => {
    service.generer(2026, 3).subscribe();
    const req = http.expectOne(r => r.url === `${base}/generer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('annee')).toBe('2026');
    expect(req.request.params.get('trimestre')).toBe('3');
    req.flush(null);
  });
});

describe('trimestresTermines', () => {
  it('exclut le trimestre en cours et part du precedent', () => {
    const r = trimestresTermines(new Date(2026, 9, 6), 3); // 6 octobre 2026 = T4 en cours
    expect(r.map(t => t.libelle)).toEqual(['T3 2026', 'T2 2026', 'T1 2026']);
  });

  it('traverse le changement d\'annee', () => {
    const r = trimestresTermines(new Date(2026, 0, 15), 3); // T1 2026 en cours
    expect(r.map(t => t.libelle)).toEqual(['T4 2025', 'T3 2025', 'T2 2025']);
  });

  it('formate le libelle', () => {
    expect(libelleTrimestre(2026, 3)).toBe('T3 2026');
  });
});
```

- [ ] **Step 2: Lancer le test, verifier l'echec**

Run: `npx ng test --watch=false --include='**/etat-trimestriel.service.spec.ts'`
Expected: FAIL (module `./etat-trimestriel.service` introuvable).

- [ ] **Step 3: Implementer**

`etat-trimestriel.models.ts` :

```ts
export interface EtatTrimestrielResume {
  id: string;
  annee: number;
  trimestre: number;
  dateArret: string;       // AAAA-MM-JJ
  dateGeneration: string;  // instant ISO
  generePar: string;
  nbPersonnes: number;
  sha256Pdf: string;
  sha256Excel: string;
  remplace: boolean;
}

export interface TrimestreOption {
  annee: number;
  trimestre: number;
  libelle: string;
}
```

`etat-trimestriel.service.ts` :

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EtatTrimestrielResume, TrimestreOption } from '../models/etat-trimestriel.models';

export function libelleTrimestre(annee: number, trimestre: number): string {
  return `T${trimestre} ${annee}`;
}

/** Les `nombre` derniers trimestres TERMINES, du plus recent au plus ancien (le trimestre en cours est exclu). */
export function trimestresTermines(aujourdhui: Date, nombre: number): TrimestreOption[] {
  let annee = aujourdhui.getFullYear();
  let trimestre = Math.floor(aujourdhui.getMonth() / 3) + 1;
  const resultat: TrimestreOption[] = [];
  for (let i = 0; i < nombre; i++) {
    if (trimestre === 1) { annee -= 1; trimestre = 4; } else { trimestre -= 1; }
    resultat.push({ annee, trimestre, libelle: libelleTrimestre(annee, trimestre) });
  }
  return resultat;
}

@Injectable({ providedIn: 'root' })
export class EtatTrimestrielService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rapports/etats-trimestriels`;

  lister(): Observable<EtatTrimestrielResume[]> {
    return this.http.get<EtatTrimestrielResume[]>(this.baseUrl);
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  excel(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/excel`, { responseType: 'blob' });
  }

  generer(annee: number, trimestre: number): Observable<void> {
    const params = new HttpParams().set('annee', annee).set('trimestre', trimestre);
    return this.http.post<void>(`${this.baseUrl}/generer`, null, { params });
  }
}
```

- [ ] **Step 4: Lancer le test, verifier le succes**

Run: `npx ng test --watch=false --include='**/etat-trimestriel.service.spec.ts'`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/rapports
git commit -m "feat(etats-trimestriels): service HTTP et liste des trimestres termines"
```

---

### Task 2: Page « Etats trimestriels »

**Files:**
- Create: `src/app/features/rapports/etats-trimestriels-page/etats-trimestriels-page.ts`
- Create: `src/app/features/rapports/etats-trimestriels-page/etats-trimestriels-page.html`
- Create: `src/app/features/rapports/etats-trimestriels-page/etats-trimestriels-page.scss`
- Test: `src/app/features/rapports/etats-trimestriels-page/etats-trimestriels-page.spec.ts`

**Interfaces:**
- Consumes: `EtatTrimestrielService` (`lister/pdf/excel/generer`), `trimestresTermines`, `libelleTrimestre`, `RapportService.telecharger`, `AuthService.hasRole(role: string): boolean`, `ConfirmDialog` + `ConfirmDialogData` (`shared/ui/confirm-dialog`), `PageHeader` (`titre`, `sousTitre`).
- Produces: `EtatsTrimestrielsPage` (route component), signaux `etats`, `chargement`, `erreur`, `enGeneration`, `peutGenerer`, `trimestreChoisi`.

- [ ] **Step 1: Ecrire le test qui echoue**

```ts
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/auth/auth.service';
import { RapportService } from '../services/rapport.service';
import { EtatTrimestrielService } from '../services/etat-trimestriel.service';
import { EtatsTrimestrielsPage } from './etats-trimestriels-page';

const etat = (id: string, remplace = false) => ({
  id, annee: 2026, trimestre: 3, dateArret: '2026-09-30', dateGeneration: '2026-10-06T10:00:00Z',
  generePar: 'SYSTEME', nbPersonnes: 12, sha256Pdf: 'a'.repeat(64), sha256Excel: 'b'.repeat(64), remplace
});

describe('EtatsTrimestrielsPage', () => {
  const etats = { lister: vi.fn(), pdf: vi.fn(), excel: vi.fn(), generer: vi.fn() };
  const rapports = { telecharger: vi.fn() };
  const toastr = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const dialog = { open: vi.fn() };
  let admin = true;

  function creer() {
    TestBed.configureTestingModule({
      imports: [EtatsTrimestrielsPage],
      providers: [
        { provide: EtatTrimestrielService, useValue: etats },
        { provide: RapportService, useValue: rapports },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { hasRole: (r: string) => admin && r === 'ADMIN' } }
      ]
    });
    const fixture = TestBed.createComponent(EtatsTrimestrielsPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => { vi.resetAllMocks(); admin = true; });

  it('charge et affiche les etats', () => {
    etats.lister.mockReturnValue(of([etat('a'), etat('b', true)]));
    const f = creer();
    expect(f.componentInstance.etats().length).toBe(2);
    expect(f.componentInstance.erreur()).toBeNull();
  });

  it('liste vide : aucun etat, pas d\'erreur', () => {
    etats.lister.mockReturnValue(of([]));
    const f = creer();
    expect(f.componentInstance.etats()).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Aucun état');
  });

  it('echec du chargement : message d\'erreur', () => {
    etats.lister.mockReturnValue(throwError(() => ({ status: 403 })));
    const f = creer();
    expect(f.componentInstance.erreur()).toBeTruthy();
  });

  it('seul l\'administrateur peut generer', () => {
    etats.lister.mockReturnValue(of([]));
    admin = false;
    expect(creer().componentInstance.peutGenerer()).toBe(false);
  });

  it('telecharge le PDF avec un nom parlant', () => {
    etats.lister.mockReturnValue(of([etat('a')]));
    const blob = new Blob(['x']);
    etats.pdf.mockReturnValue(of(blob));
    const f = creer();
    f.componentInstance.telechargerPdf(f.componentInstance.etats()[0]);
    expect(rapports.telecharger).toHaveBeenCalledWith(blob, 'etat-trimestriel-T3-2026.pdf');
  });

  it('generer : confirmation puis appel, rechargement et toast', () => {
    etats.lister.mockReturnValue(of([]));
    etats.generer.mockReturnValue(of(undefined));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(etats.generer).toHaveBeenCalledWith(2026, 3);
    expect(toastr.success).toHaveBeenCalled();
    expect(etats.lister).toHaveBeenCalledTimes(2);
    expect(f.componentInstance.enGeneration()).toBe(false);
  });

  it('generer annule : aucun appel', () => {
    etats.lister.mockReturnValue(of([]));
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(etats.generer).not.toHaveBeenCalled();
  });

  it('generer : le message du serveur est affiche (limite atteinte)', () => {
    etats.lister.mockReturnValue(of([]));
    etats.generer.mockReturnValue(throwError(() => ({ error: { message: 'limite atteinte' } })));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    const f = creer();
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(toastr.error).toHaveBeenCalledWith('limite atteinte');
    expect(f.componentInstance.enGeneration()).toBe(false);
  });

  it('pas de double generation pendant qu\'une est en cours', () => {
    etats.lister.mockReturnValue(of([]));
    const f = creer();
    f.componentInstance.enGeneration.set(true);
    f.componentInstance.trimestreChoisi.set({ annee: 2026, trimestre: 3, libelle: 'T3 2026' });
    f.componentInstance.generer();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test, verifier l'echec**

Run: `npx ng test --watch=false --include='**/etats-trimestriels-page.spec.ts'`
Expected: FAIL (composant introuvable).

- [ ] **Step 3: Implementer `etats-trimestriels-page.ts`**

```ts
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule, FileText, FileSpreadsheet, Download, RefreshCw, LucideIconData } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { EtatTrimestrielResume, TrimestreOption } from '../models/etat-trimestriel.models';
import { EtatTrimestrielService, libelleTrimestre, trimestresTermines } from '../services/etat-trimestriel.service';
import { RapportService } from '../services/rapport.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-etats-trimestriels-page',
  standalone: true,
  imports: [DatePipe, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, LucideAngularModule, PageHeader],
  templateUrl: './etats-trimestriels-page.html',
  styleUrl: './etats-trimestriels-page.scss'
})
export class EtatsTrimestrielsPage {
  private readonly service = inject(EtatTrimestrielService);
  private readonly rapports = inject(RapportService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  readonly icons: Record<string, LucideIconData> = { FileText, FileSpreadsheet, Download, RefreshCw };

  readonly etats = signal<EtatTrimestrielResume[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly enGeneration = signal(false);

  readonly peutGenerer = computed(() => this.auth.hasRole('ADMIN'));
  readonly trimestres: TrimestreOption[] = trimestresTermines(new Date(), 8);
  readonly trimestreChoisi = signal<TrimestreOption | null>(this.trimestres[0] ?? null);

  constructor() {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.service.lister().subscribe({
      next: liste => { this.etats.set(liste); this.chargement.set(false); },
      error: () => {
        this.erreur.set('Impossible de charger les états trimestriels.');
        this.chargement.set(false);
      }
    });
  }

  libelle(e: EtatTrimestrielResume): string {
    return libelleTrimestre(e.annee, e.trimestre);
  }

  telechargerPdf(e: EtatTrimestrielResume): void {
    this.service.pdf(e.id).subscribe({
      next: blob => this.rapports.telecharger(blob, `etat-trimestriel-T${e.trimestre}-${e.annee}.pdf`),
      error: () => this.toastr.error('Impossible de télécharger le PDF')
    });
  }

  telechargerExcel(e: EtatTrimestrielResume): void {
    this.service.excel(e.id).subscribe({
      next: blob => this.rapports.telecharger(blob, `etat-trimestriel-T${e.trimestre}-${e.annee}.xlsx`),
      error: () => this.toastr.error('Impossible de télécharger l\'Excel')
    });
  }

  generer(): void {
    const t = this.trimestreChoisi();
    if (!t || this.enGeneration()) return;
    const data: ConfirmDialogData = {
      titre: `Générer l'état ${t.libelle}`,
      message: `Générer maintenant l'état trimestriel ${t.libelle} ?`,
      detail: 'Si un état existe déjà pour ce trimestre, il sera conservé et marqué « remplacé » (3 régénérations au maximum).',
      libelleConfirmer: 'Générer'
    };
    this.dialog.open(ConfirmDialog, { data }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.enGeneration.set(true);
      this.service.generer(t.annee, t.trimestre).subscribe({
        next: () => {
          this.toastr.success(`État ${t.libelle} généré`);
          this.enGeneration.set(false);
          this.charger();
        },
        error: err => {
          this.toastr.error(err?.error?.message ?? 'Impossible de générer l\'état');
          this.enGeneration.set(false);
        }
      });
    });
  }
}
```

- [ ] **Step 4: `etats-trimestriels-page.html`**

```html
<div class="etats-page">
  <app-page-header titre="États trimestriels"
                   sousTitre="États officiels des personnes fichées remis à la hiérarchie, générés chaque trimestre"/>

  @if (peutGenerer()) {
    <section class="etats-generer">
      <mat-form-field appearance="outline">
        <mat-label>Trimestre</mat-label>
        <mat-select [value]="trimestreChoisi()" (selectionChange)="trimestreChoisi.set($event.value)">
          @for (t of trimestres; track t.libelle) {
            <mat-option [value]="t">{{ t.libelle }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button class="btn-generer" [disabled]="enGeneration() || !trimestreChoisi()" (click)="generer()">
        @if (enGeneration()) {
          <mat-spinner diameter="16"></mat-spinner><span>Génération...</span>
        } @else {
          <lucide-icon [name]="icons['RefreshCw']" [size]="14"></lucide-icon><span>Générer maintenant</span>
        }
      </button>
    </section>
  }

  @if (chargement()) {
    <p class="etats-info">Chargement...</p>
  } @else if (erreur()) {
    <p class="etats-erreur" role="alert">{{ erreur() }}</p>
  } @else if (etats().length === 0) {
    <p class="etats-info">Aucun état archivé pour le moment. Le premier sera généré automatiquement au début du prochain trimestre.</p>
  } @else {
    <table class="etats-table">
      <thead>
        <tr><th>Période</th><th>Date d'arrêt</th><th>Établi le</th><th>Généré par</th><th>Personnes</th><th>Empreinte PDF</th><th></th></tr>
      </thead>
      <tbody>
        @for (e of etats(); track e.id) {
          <tr [class.etats-table__remplace]="e.remplace">
            <td>{{ libelle(e) }} @if (e.remplace) { <span class="badge-remplace">remplacé</span> }</td>
            <td>{{ e.dateArret | date:'dd/MM/yyyy' }}</td>
            <td>{{ e.dateGeneration | date:'dd/MM/yyyy' }}</td>
            <td>{{ e.generePar }}</td>
            <td>{{ e.nbPersonnes }}</td>
            <td class="etats-table__hash" [title]="e.sha256Pdf">{{ e.sha256Pdf.substring(0, 12) }}…</td>
            <td class="etats-table__actions">
              <button (click)="telechargerPdf(e)"><lucide-icon [name]="icons['FileText']" [size]="14"></lucide-icon> PDF</button>
              <button (click)="telechargerExcel(e)"><lucide-icon [name]="icons['FileSpreadsheet']" [size]="14"></lucide-icon> Excel</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  }
</div>
```

`etats-trimestriels-page.scss` : reprendre les variables et classes de `rapports-page.scss` (`.btn-generer`, tableaux de `administration-page`), avec `.etats-table__remplace { opacity: .6 }`, `.badge-remplace` (petite pastille grise), `.etats-erreur { color: var(--danger, #b00020) }`. Lire `rapports-page.scss` d'abord et reutiliser les memes jetons de couleur plutot que d'en inventer.

- [ ] **Step 5: Lancer le test**

Run: `npx ng test --watch=false --include='**/etats-trimestriels-page.spec.ts'`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/rapports
git commit -m "feat(etats-trimestriels): page de liste, telechargement et generation"
```

---

### Task 3: Route, menu et verification dans l'application

**Files:**
- Modify: `src/app/app.routes.ts` (apres la route `rapports`)
- Modify: `src/app/layout/menu.config.ts` (section « Pilotage »)

- [ ] **Step 1: Ajouter la route**

```ts
      // ---- Etats trimestriels : VALIDATEUR + ADMIN ----
      {
        path: 'etats-trimestriels',
        canActivate: [roleGuard('VALIDATEUR', 'ADMIN')],
        loadComponent: () =>
          import('./features/rapports/etats-trimestriels-page/etats-trimestriels-page').then((m) => m.EtatsTrimestrielsPage)
      },
```

- [ ] **Step 2: Ajouter l'entree de menu** dans la section « Pilotage », apres « Rapports » (importer `CalendarClock` depuis `lucide-angular`) :

```ts
      { route: '/etats-trimestriels', label: 'États trimestriels', icone: CalendarClock, roles: ['VALIDATEUR', 'ADMIN'] }
```
(ajouter une virgule a la ligne « Rapports » qui la precede).

- [ ] **Step 3: Verifier la compilation et toute la suite**

Run: `npx ng build` puis `npx ng test --watch=false`
Expected: build sans erreur; tous les tests passent (aucune regression).

- [ ] **Step 4: Verification manuelle** (backend deploye ou lance en local avec la migration V13)
- [ ] Connecte en ADMIN : l'entree « États trimestriels » est dans le menu; la page liste l'etat T3 2026 genere automatiquement.
- [ ] Telecharger le PDF et l'Excel : les ouvrir, verifier periode, dates jj/mm/aaaa, synthese et liste.
- [ ] « Generer maintenant » sur T3 2026 : confirmation, toast, une nouvelle ligne et l'ancienne marquee « remplacé ». Apres 3 regenerations, la 4e affiche le message de limite.
- [ ] Connecte en VALIDATEUR : page visible, pas de bloc « Generer ». Connecte en AGENT : entree absente du menu, acces direct a l'URL refuse.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.routes.ts src/app/layout/menu.config.ts
git commit -m "feat(etats-trimestriels): route et entree de menu (VALIDATEUR, ADMIN)"
```
