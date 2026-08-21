import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../ui/confirm-dialog/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialog = inject(MatDialog);

  demander(data: ConfirmDialogData): Observable<boolean> {
    const ref = this.dialog.open(ConfirmDialog, { data, width: '440px' });
    return ref.afterClosed().pipe(map((resultat) => resultat === true));
  }
}
