import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

export interface BarChartData {
  libelle: string;
  valeur: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss'
})
export class BarChart {
  readonly donnees = input.required<BarChartData[]>();

  // Calcul du max pour normaliser les largeurs des barres
  readonly valeurMax = computed(() => {
    const d = this.donnees();
    if (d.length === 0) return 1;
    return Math.max(...d.map((x) => x.valeur));
  });

  // Retourne un pourcentage entre 5 (largeur minimale visible) et 100
  pourcentage(valeur: number): number {
    const max = this.valeurMax();
    if (max === 0) return 5;
    return Math.max(5, (valeur / max) * 100);
  }
}
