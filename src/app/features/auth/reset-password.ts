import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BrandLogo } from '../../shared/ui/brand-logo';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  if (!password || !confirm || password === confirm) {
    return null;
  }
  return { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    LanguageSwitcher,
    BrandLogo,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' },
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly i18n = inject(I18nService);

  /** Bound from query params via withComponentInputBinding. */
  readonly token = input<string>('');

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly success = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(PASSWORD_PATTERN),
        ],
      ],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (!this.token() || this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.resetPassword(this.token(), this.form.controls.password.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.httpError(error, 'reset.failed'));
      },
    });
  }
}
