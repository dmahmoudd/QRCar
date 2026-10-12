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
  templateUrl: './profile.html',
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
