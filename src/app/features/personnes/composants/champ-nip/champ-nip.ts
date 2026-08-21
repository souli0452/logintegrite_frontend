import { Component, OnInit, forwardRef, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import {
  LucideAngularModule, IdCard, AlertTriangle, CheckCircle2, ExternalLink,
  LucideIconData
} from 'lucide-angular';

import { PersonnePhysiqueService } from '../../services/personne-physique.service';
import { VerificationNipResponse } from '../../models/personne.models';

/**
 * Champ de saisie NIP CNIB avec vérification anti-doublon en temps réel.
 * Conforme au pattern de formulaire UI/UX du projet.
 */
@Component({
  selector: 'app-champ-nip',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChampNip),
      multi: true
    }
  ],
  templateUrl: './champ-nip.html',
  styleUrl: './champ-nip.scss'
})
export class ChampNip implements OnInit, ControlValueAccessor {
  private readonly personneService = inject(PersonnePhysiqueService);

  // ─── Inputs ────────────────────────────────────────────────────────────────
  /** ID de la personne à exclure lors de la vérification (en cas de modification). */
  readonly exclureId = input<string | undefined>(undefined);

  /** Libellé du champ (défaut : "NIP"). */
  readonly libelle = input<string>('NIP');

  /** Indique si le champ est obligatoire (affiche l'astérisque rouge). */
  readonly requis = input<boolean>(false);

  /** Placeholder. */
  readonly placeholder = input<string>('');

  // ─── Icônes ────────────────────────────────────────────────────────────────
  readonly icons: Record<string, LucideIconData> = {
    IdCard, AlertTriangle, CheckCircle2, ExternalLink
  };

  // ─── État interne ──────────────────────────────────────────────────────────
  readonly formCtrl = new FormControl<string>('', {
    nonNullable: true,
    validators: [
      Validators.minLength(17),
      Validators.maxLength(17),
      Validators.pattern(/^[A-Z0-9]+$/)
    ]
  });

  readonly verification = signal<'idle' | 'checking' | 'disponible' | 'doublon'>('idle');
  readonly personneDoublon = signal<VerificationNipResponse | null>(null);

  // ─── ControlValueAccessor callbacks ───────────────────────────────────────
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Cycle de vie
  // ═══════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.formCtrl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((value) => {
        const nettoye = (value ?? '').trim().toUpperCase();

        // Propagation vers le formulaire parent
        this.onChange(nettoye || null);

        // Réinitialisation si la valeur n'est pas au format requis (17 caractères alphanumériques)
        if (!nettoye || nettoye.length !== 17 || !/^[A-Z0-9]+$/.test(nettoye)) {
          this.verification.set('idle');
          this.personneDoublon.set(null);
          return of(null);
        }

        this.verification.set('checking');
        return this.personneService.verifierNip(nettoye, this.exclureId());
      })
    ).subscribe({
      next: (response) => {
        if (!response) return;
        if (response.disponible) {
          this.verification.set('disponible');
          this.personneDoublon.set(null);
        } else {
          this.verification.set('doublon');
          this.personneDoublon.set(response);
        }
      },
      error: () => {
        this.verification.set('idle');
        this.personneDoublon.set(null);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Normalisation & Handlers
  // ═══════════════════════════════════════════════════════════════════════════
  normaliserSaisie(event: Event): void {
    const input = event.target as HTMLInputElement;
    const brut = input.value;
    const normalise = brut.replace(/\s/g, '').toUpperCase();
    if (brut !== normalise) {
      input.value = normalise;
      this.formCtrl.setValue(normalise, { emitEvent: true });
    }
  }

  onBlur(): void {
    this.onTouched();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ControlValueAccessor
  // ═══════════════════════════════════════════════════════════════════════════
  writeValue(value: string | null): void {
    this.formCtrl.setValue(value ?? '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) this.formCtrl.disable();
    else this.formCtrl.enable();
  }
}
