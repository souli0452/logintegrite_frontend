import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule, FileText, FileSpreadsheet, Download, ChevronDown,
  Search, X, Shield, ClipboardList, LucideIconData
} from 'lucide-angular';

import { RapportService } from '../services/rapport.service';
import { DossierService } from '../../dossiers/services/dossier.service';
import { DossierResponse } from '../../dossiers/models/dossier.models';

type CarteId = 'PDF_DOSSIER' | 'PDF_REGISTRE' | 'EXCEL_PERSONNES' | 'EXCEL_DOSSIERS';

@Component({
  selector: 'app-rapports-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatAutocompleteModule, MatProgressSpinnerModule,
    LucideAngularModule
  ],
  templateUrl: './rapports-page.html',
  styleUrl: './rapports-page.scss'
})
export class RapportsPage implements OnDestroy {
  private readonly rapportService = inject(RapportService);
  private readonly dossierService = inject(DossierService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);

  readonly icons: Record<string, LucideIconData> = {
    FileText, FileSpreadsheet, Download, ChevronDown,
    Search, X, Shield, ClipboardList
  };

  // Etat d'expansion des cartes
  readonly carteActive = signal<CarteId | null>(null);
  // Chargement par carte
  readonly enCoursGeneration = signal<CarteId | null>(null);

  // ---- Autocomplete dossier : chargement puis filtrage client ----
  private readonly TAILLE_CHARGEMENT = 200;
  readonly dossiersCharges = signal<DossierResponse[]>([]);
  readonly rechercheDossier = this.fb.control('');
  private readonly termeSaisi = toSignal(this.rechercheDossier.valueChanges, { initialValue: '' });

  // Suggestions filtrees selon la saisie (ou 20 premiers si vide)
  readonly dossiersSuggeres = computed<DossierResponse[]>(() => {
    const brut = this.termeSaisi();
    // Si l'utilisateur a selectionne un dossier, valueChanges emet l'objet lui-meme
    const terme = (typeof brut === 'string' ? brut : '').toLowerCase().trim();
    const tous = this.dossiersCharges();
    if (!terme) return tous.slice(0, 20);
    return tous.filter(d =>
      (d.numeroDossier?.toLowerCase().includes(terme)) ||
      (d.intitule?.toLowerCase().includes(terme))
    ).slice(0, 20);
  });

  readonly dossierSelectionne = signal<DossierResponse | null>(null);

  // Filtres Excel personnes
  readonly filtresPersonnes = this.fb.group({
    typePersonne: [''],
    nomOuDenomination: ['']
  });

  private readonly subs: Subscription[] = [];

  constructor() {
    // Chargement des dossiers une seule fois
    this.subs.push(
      this.dossierService.lister(0, this.TAILLE_CHARGEMENT).subscribe({
        next: page => this.dossiersCharges.set(page.content),
        error: () => {
          this.dossiersCharges.set([]);
          this.toastr.warning('Impossible de charger la liste des dossiers');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  basculerCarte(id: CarteId): void {
    this.carteActive.set(this.carteActive() === id ? null : id);
  }

  afficherDossier(d: DossierResponse | null): string {
    if (!d) return '';
    const num = d.numeroDossier ?? 'Sans numéro';
    const titre = d.intitule ?? 'Sans intitulé';
    return `${num} — ${titre}`;
  }

  selectionnerDossier(d: DossierResponse): void {
    this.dossierSelectionne.set(d);
  }

  // ===== Actions de generation =====
  genererPdfDossier(): void {
    const d = this.dossierSelectionne();
    if (!d) {
      this.toastr.warning('Sélectionnez un dossier');
      return;
    }
    this.enCoursGeneration.set('PDF_DOSSIER');
    this.rapportService.pdfDossier(d.id).subscribe({
      next: blob => {
        const nom = d.numeroDossier
          ? `dossier-${d.numeroDossier}.pdf`
          : `dossier-${d.id.substring(0, 8)}.pdf`;
        this.rapportService.telecharger(blob, nom);
        this.toastr.success('PDF téléchargé');
        this.enCoursGeneration.set(null);
      },
      error: () => {
        this.toastr.error('Impossible de générer le PDF');
        this.enCoursGeneration.set(null);
      }
    });
  }

  genererPdfRegistre(): void {
    this.enCoursGeneration.set('PDF_REGISTRE');
    this.rapportService.pdfRegistreOfficiel().subscribe({
      next: blob => {
        const date = new Date().toISOString().substring(0, 10);
        this.rapportService.telecharger(blob, `registre-officiel-${date}.pdf`);
        this.toastr.success('Registre téléchargé');
        this.enCoursGeneration.set(null);
      },
      error: () => {
        this.toastr.error('Impossible de générer le registre');
        this.enCoursGeneration.set(null);
      }
    });
  }

  genererExcelPersonnes(): void {
    const v = this.filtresPersonnes.getRawValue();
    this.enCoursGeneration.set('EXCEL_PERSONNES');
    this.rapportService.excelRecherchePersonnes({
      typePersonne: (v.typePersonne as 'PHYSIQUE' | 'MORALE') || undefined,
      nomOuDenomination: v.nomOuDenomination || undefined
    }).subscribe({
      next: blob => {
        this.rapportService.telecharger(blob, 'personnes-recensees.xlsx');
        this.toastr.success('Excel téléchargé');
        this.enCoursGeneration.set(null);
      },
      error: () => {
        this.toastr.error('Impossible de générer l\'Excel');
        this.enCoursGeneration.set(null);
      }
    });
  }

  genererExcelDossiers(): void {
    this.enCoursGeneration.set('EXCEL_DOSSIERS');
    this.rapportService.excelDossiers().subscribe({
      next: blob => {
        const date = new Date().toISOString().substring(0, 10);
        this.rapportService.telecharger(blob, `dossiers-${date}.xlsx`);
        this.toastr.success('Excel téléchargé');
        this.enCoursGeneration.set(null);
      },
      error: () => {
        this.toastr.error('Impossible de générer l\'Excel');
        this.enCoursGeneration.set(null);
      }
    });
  }
}
