import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { extractErrorMessage } from '../../core/http/problem-details';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white"
        >
          <mat-icon class="!h-8 !w-8 !text-3xl">qr_code_2</mat-icon>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
        <p class="mt-1 text-sm text-slate-500">Sign in to manage your cars and QR codes.</p>
      </div>

      <mat-card class="p-2">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <mat-card-content class="!p-6">
          @if (expired()) {
            <div
              class="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              <mat-icon class="!h-5 !w-5 !text-xl">schedule</mat-icon>
              <span>Your session expired. Please sign in again.</span>
            </div>
          }

          @if (errorMessage()) {
            <div class="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              <mat-icon class="!h-5 !w-5 !text-xl">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Enter a valid email address.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                (click)="showPassword.set(!showPassword())"
              >
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>Password is required.</mat-error>
              }
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              class="!mt-2 !h-11"
              type="submit"
              [disabled]="loading()"
            >
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <p class="mt-6 text-center text-sm text-slate-500">
        Don't have an account?
        <a class="font-medium text-brand-600 hover:underline" routerLink="/register">Create one</a>
      </p>
      <p class="mt-3 text-center text-sm text-slate-500">
        Just need to contact a car owner?
        <a class="font-medium text-brand-600 hover:underline" routerLink="/scan">Scan a QR code</a>
      </p>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  /** Bound from query params via withComponentInputBinding. */
  readonly returnUrl = input<string>('');
  readonly expired = input<string>('');

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const target = this.returnUrl() || '/dashboard';
        void this.router.navigateByUrl(target);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not sign you in.'));
      },
    });
  }
}
