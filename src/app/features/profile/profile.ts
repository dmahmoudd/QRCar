import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { UsersApiService } from '../../core/api/users-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { UserProfile } from '../../core/models/user.models';
import { LocationShareService } from '../../core/services/location-share.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/ui/page-header';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    PageHeader,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Profile" subtitle="Your contact details and account information." />

    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage() && !profile()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (profile(); as user) {
      <div class="grid max-w-4xl gap-6 lg:grid-cols-5">
        <mat-card class="lg:col-span-3">
          <mat-card-header class="!px-6 !pt-6">
            <mat-card-title class="text-lg font-semibold">Contact details</mat-card-title>
            <mat-card-subtitle>
              Scanners see a masked number. Call and WhatsApp still reach you.
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content class="!p-6">
            @if (errorMessage()) {
              <div
                class="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900"
              >
                <mat-icon class="!h-5 !w-5 !text-xl">error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
              <mat-form-field appearance="outline">
                <mat-label>Full name</mat-label>
                <input matInput formControlName="fullName" autocomplete="name" />
                @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                  <mat-error>Your name is required.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone number</mat-label>
                <input matInput formControlName="phoneNumber" placeholder="+905551112233" />
                <mat-hint>Include the country code. Stored encrypted; not shown in full on the scan page.</mat-hint>
                @if (form.controls.phoneNumber.touched && form.controls.phoneNumber.invalid) {
                  <mat-error>Use international format, for example +905551112233.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [value]="user.email" disabled />
                <mat-hint>Email cannot be changed yet.</mat-hint>
              </mat-form-field>

              <div class="mt-2 rounded-lg bg-slate-50 p-4">
                <mat-slide-toggle formControlName="shareLocation">
                  Share my last location
                </mat-slide-toggle>
                <p class="mt-2 text-xs text-slate-500">
                  When on, this tab asks the browser for GPS and stores the last successful ping.
                  Anyone who scans your code can open that point on a map. A switched-off or
                  closed phone cannot send a new position — they only see the last ping.
                </p>
                @if (user.lastLocatedAtUtc) {
                  <p class="mt-2 text-xs text-slate-400">
                    Last ping {{ user.lastLocatedAtUtc | relativeTime }}
                  </p>
                }
              </div>

              <div class="mt-3 flex gap-2">
                <button
                  mat-flat-button
                  color="primary"
                  class="!h-11"
                  type="submit"
                  [disabled]="saving() || form.pristine"
                >
                  {{ saving() ? 'Saving…' : 'Save changes' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <div class="flex flex-col gap-6 lg:col-span-2">
          <mat-card>
            <mat-card-content class="!p-6">
              <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Account
              </h2>
              <dl class="divide-y divide-slate-100">
                <div class="flex justify-between py-3">
                  <dt class="text-sm text-slate-500">Cars</dt>
                  <dd class="text-sm font-medium text-slate-900">{{ user.carCount }}</dd>
                </div>
                <div class="flex justify-between py-3">
                  <dt class="text-sm text-slate-500">Role</dt>
                  <dd class="text-sm text-slate-900">{{ user.role }}</dd>
                </div>
                <div class="flex justify-between py-3">
                  <dt class="text-sm text-slate-500">Member since</dt>
                  <dd class="text-sm text-slate-900">
                    {{ user.createdAtUtc | date: 'mediumDate' }}
                  </dd>
                </div>
              </dl>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content class="!p-6">
              <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Session
              </h2>
              <p class="mb-4 text-sm text-slate-500">
                Signing out removes the access token from this device.
              </p>
              <button mat-stroked-button (click)="signOut()">
                <mat-icon>logout</mat-icon>
                Sign out
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    }
  `,
})
export class Profile {
  private readonly usersApi = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly locationShare = inject(LocationShareService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(E164_PATTERN)]],
    shareLocation: [false],
  });

  constructor() {
    this.usersApi.getMyProfile().subscribe({
      next: (user) => {
        this.profile.set(user);
        this.form.patchValue({
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          shareLocation: user.shareLocation,
        });
        this.syncLocationWatch(user.shareLocation);
        this.form.markAsPristine();
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load your profile.'));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();

    this.usersApi
      .updateMyProfile({
        fullName: value.fullName.trim(),
        phoneNumber: value.phoneNumber.trim(),
        shareLocation: value.shareLocation,
      })
      .subscribe({
        next: (user) => {
          this.profile.set(user);
          this.form.markAsPristine();
          this.saving.set(false);
          this.auth.patchDisplayName(user.fullName);
          this.syncLocationWatch(user.shareLocation);
          this.notifications.success('Profile updated.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(extractErrorMessage(error, 'Could not save your profile.'));
        },
      });
  }

  protected signOut(): void {
    this.locationShare.stop();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private syncLocationWatch(enabled: boolean): void {
    if (enabled) {
      this.locationShare.start();
    } else {
      this.locationShare.stop();
    }
  }
}
