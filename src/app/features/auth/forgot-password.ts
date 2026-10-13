import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly i18n = inject(I18nService);

  protected readonly step = signal<'email' | 'password' | 'done'>('email');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);
  private resetToken = '';

  protected readonly emailForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group(
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

  protected checkEmail(): void {
    if (this.emailForm.invalid || this.loading()) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.forgotPassword(this.emailForm.controls.email.value).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.exists || !response.resetToken) {
          this.errorMessage.set(this.i18n.t('forgot.notFound'));
          return;
        }

        this.resetToken = response.resetToken;
        this.step.set('password');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.httpError(error, 'forgot.failed'));
      },
    });
  }

  protected savePassword(): void {
    if (!this.resetToken || this.passwordForm.invalid || this.loading()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.resetPassword(this.resetToken, this.passwordForm.controls.password.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetToken = '';
        this.step.set('done');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.httpError(error, 'reset.failed'));
      },
    });
  }

  protected backToEmail(): void {
    this.resetToken = '';
    this.passwordForm.reset();
    this.errorMessage.set('');
    this.step.set('email');
  }
}
