import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-access-denied',
  standalone: true,
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.scss'
})
export class AccessDenied {}
