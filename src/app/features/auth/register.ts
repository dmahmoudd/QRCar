import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

/** Mirrors the API's E.164 rule so the user is told before a round trip. */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

@Component({
  selector: 'app-register',
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
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
        <p class="mt-1 text-sm text-slate-500">
          People who scan your code can contact you without seeing your full number.
        </p>
      </div>

      <mat-card class="p-2">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <mat-card-content class="!p-6">
          @if (errorMessage()) {
            <div class="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              <mat-icon class="!h-5 !w-5 !text-xl">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
            <mat-form-field appearance="outline">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="fullName" autocomplete="name" />
              @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                <mat-error>Please tell us your name.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Enter a valid email address.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Phone number</mat-label>
              <input matInput formControlName="phoneNumber" placeholder="+905551112233" />
              <mat-hint>Include the country code. Kept private and encrypted.</mat-hint>
              @if (form.controls.phoneNumber.touched && form.controls.phoneNumber.invalid) {
                <mat-error>Use international format, for example +905551112233.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
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
              <mat-hint>At least 8 characters, with a letter and a digit.</mat-hint>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>
                  Needs 8+ characters including at least one letter and one digit.
                </mat-error>
              }
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              class="!mt-4 !h-11"
              type="submit"
              [disabled]="loading()"
            >
              {{ loading() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <p class="mt-6 text-center text-sm text-slate-500">
        Already registered?
        <a class="font-medium text-brand-600 hover:underline" routerLink="/login">Sign in</a>
      </p>
    </div>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(E164_PATTERN)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
      ],
    ],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/cars/new'], { queryParams: { welcome: '1' } }),
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not create your account.'));
      },
    });
  }
}
