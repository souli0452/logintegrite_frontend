import { Component, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { 
  LucideAngularModule, 
  RotateCw, Users, FolderPlus, CheckSquare, FileText, ArrowRight, Clock, Target, Building2, 
  LucideIconData 
} from 'lucide-angular';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatCardExecutif } from '../../../../shared/ui/stat-card-executif/stat-card-executif';

import { StatistiquesService } from '../../services/statistiques.service';
import { DashboardExecutifResponse } from '../../models/statistiques.models';
import { DossierService } from '../../../dossiers/services/dossier.service';
import { DossierResponse } from '../../../dossiers/models/dossier.models';
import { AuthService } from '../../../../core/auth/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-vue',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, RouterLink,
    MatProgressSpinnerModule, MatButtonModule,
    LucideAngularModule,
    PageHeader, StatCardExecutif
  ],
  templateUrl: './dashboard-vue.html',
  styleUrl: './dashboard-vue.scss'
})
export class DashboardVue implements OnDestroy {
  private readonly service = inject(StatistiquesService);
  private readonly dossierService = inject(DossierService);
  readonly auth = inject(AuthService);

  @ViewChild('canvasCourbe') canvasCourbe?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasDonut') canvasDonut?: ElementRef<HTMLCanvasElement>;

  readonly donnees = signal<DashboardExecutifResponse | null>(null);
  readonly derniersDossiers = signal<DossierResponse[]>([]);
  readonly chargement = signal<boolean>(true);
  readonly today = new Date();

  readonly icons: Record<string, LucideIconData> = {
    RotateCw, Users, FolderPlus, CheckSquare, FileText, ArrowRight,
    Clock, Target, Building2
  };

  private courbeChart?: Chart;
  private donutChart?: Chart;

  constructor() {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destruireGraphiques();
  }

  charger(): void {
    this.chargement.set(true);
    
    forkJoin({
      stats: this.service.dashboardExecutif(),
      dossiers: this.dossierService.lister(0, 5)
    }).subscribe({
      next: ({ stats, dossiers }) => {
        this.donnees.set(stats);
        this.derniersDossiers.set(dossiers.content ?? []);
        this.chargement.set(false);
        
        setTimeout(() => this.dessinerGraphiques(stats), 50);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques :', err);
        this.chargement.set(false);
      }
    });
  }

  private destruireGraphiques(): void {
    if (this.courbeChart) {
      this.courbeChart.destroy();
      this.courbeChart = undefined;
    }
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = undefined;
    }
  }

  private dessinerGraphiques(data: DashboardExecutifResponse): void {
    this.destruireGraphiques();

    if (this.canvasCourbe && data.evolutionDossiers?.length) {
      const ctx = this.canvasCourbe.nativeElement.getContext('2d');
      if (ctx) {
        this.courbeChart = new Chart(ctx, this.configCourbe(ctx, data));
      }
    }

    if (this.canvasDonut && data.parCategorieInfraction?.length) {
      const ctx = this.canvasDonut.nativeElement.getContext('2d');
      if (ctx) {
        this.donutChart = new Chart(ctx, this.configDonut(data));
      }
    }
  }

  private configCourbe(ctx: CanvasRenderingContext2D, data: DashboardExecutifResponse): ChartConfiguration<'line'> {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    // Utilisation du Vert ASCE-LC avec transparence (#009640)
    gradient.addColorStop(0, 'rgba(0, 150, 64, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 150, 64, 0.0)');

    return {
      type: 'line',
      data: {
        labels: data.evolutionDossiers.map((p) => p.annee.toString()),
        datasets: [{
          label: 'Dossiers ouverts',
          data: data.evolutionDossiers.map((p) => p.valeur),
          borderColor: '#009640', // Vert ASCE-LC
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#009640',
          pointBorderColor: '#FFFFFF', // Blanc ASCE-LC
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1D1D1B', // Noir ASCE-LC
            padding: 10,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(29, 29, 27, 0.08)' },
            ticks: { font: { family: 'Inter, sans-serif', size: 11 }, color: '#1D1D1B' }
          },
          x: { 
            grid: { display: false },
            ticks: { font: { family: 'Inter, sans-serif', size: 11 }, color: '#1D1D1B' }
          }
        }
      }
    };
  }

  private configDonut(data: DashboardExecutifResponse): ChartConfiguration<'doughnut'> {
    const totalCategories = data.parCategorieInfraction.length;
    const couleurs = this.genererCouleursDynamiques(totalCategories);

    return {
      type: 'doughnut',
      data: {
        labels: data.parCategorieInfraction.map((c) => c.libelle),
        datasets: [{
          data: data.parCategorieInfraction.map((c) => c.valeur),
          backgroundColor: couleurs,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: { 
              color: '#1D1D1B',
              boxWidth: 10, 
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14, 
              font: { family: 'Inter, sans-serif', size: 12 } 
            }
          }
        }
      }
    };
  }

  /**
   * Génère des couleurs basées STRICTEMENT sur la charte de l'ASCE-LC.
   * Si plus de 4 items, crée des nuances (opacité) des couleurs officielles.
   */
  private genererCouleursDynamiques(count: number): string[] {
    const paletteOfficielle = [
      '#009640', // Vert
      '#E30613', // Rouge
      '#FFDD00', // Jaune
      '#1D1D1B'  // Noir
    ];
    
    if (count <= paletteOfficielle.length) {
      return paletteOfficielle.slice(0, count);
    }

    const couleurs: string[] = [];
    for (let i = 0; i < count; i++) {
      const colorIndex = i % paletteOfficielle.length;
      const shadeLevel = Math.floor(i / paletteOfficielle.length);
      
      // On réduit l'opacité progressivement pour créer des nuances distinctes
      const opacity = Math.max(0.3, 1 - (shadeLevel * 0.25));
      
      let r, g, b;
      if (colorIndex === 0) { r = 0; g = 150; b = 64; }       // Vert
      else if (colorIndex === 1) { r = 227; g = 6; b = 19; }  // Rouge
      else if (colorIndex === 2) { r = 255; g = 221; b = 0; } // Jaune
      else { r = 29; g = 29; b = 27; }                        // Noir

      couleurs.push(`rgba(${r}, ${g}, ${b}, ${opacity})`);
    }
    return couleurs;
  }

  // Calcule le pourcentage relatif d'une structure par rapport au max du top
  calculerPourcentageStructure(valeur: number, liste: { nombre: number }[]): number {
    if (!liste || liste.length === 0) return 0;
    const max = Math.max(...liste.map(s => s.nombre));
    if (max === 0) return 0;
    return (valeur / max) * 100;
  }
}
