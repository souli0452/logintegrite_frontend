import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, FolderOpen } from 'lucide-angular';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';

/**
 * Les documents ne se gerent pas dans un espace a part : ils appartiennent a un dossier.
 * Cette page oriente vers le bon endroit plutot que d'annoncer un module a venir.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-documents-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, LucideAngularModule, EmptyState],
  template: `
    <app-empty-state
      titre="Les documents se gèrent depuis un dossier"
      message="Ouvrez un dossier puis l'onglet « Documents » pour ajouter ou consulter des pièces."
      [icone]="icone">
      <a mat-flat-button color="primary" routerLink="/dossiers">Ouvrir les dossiers</a>
    </app-empty-state>`
})
export class DocumentsPage {
  protected readonly icone = FolderOpen;
}
