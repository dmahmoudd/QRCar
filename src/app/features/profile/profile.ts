import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { UsersApiService } from '../../core/api/users-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocalDatePipe } from '../../core/i18n/local-date.pipe';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Locale } from '../../core/i18n/translations';
import { UserProfile } from '../../core/models/user.models';
import { LocationShareService } from '../../core/services/location-share.service';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    LocalDatePipe,
    MatIconModule,
    MatProgressSpinnerModule,
    RelativeTimePipe,
    TranslatePipe,
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
  private readonly i18n = inject(I18nService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly locale = this.i18n.locale;

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(E164_PATTERN)]],
    shareLocation: [false],
  });

  protected readonly maskedPhone = computed(() => {
    const phone = this.form.controls.phoneNumber.value || this.profile()?.phoneNumber || '';
    if (phone.length < 7) {
      return phone;
    }

    return `${phone.slice(0, 4)} ••• ••• ${phone.slice(-3)}`;
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
        this.errorMessage.set(this.i18n.httpError(error, 'profile.loadFailed'));
      },
    });
  }

  protected setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
  }

  protected toggleLocation(): void {
    this.form.controls.shareLocation.setValue(!this.form.controls.shareLocation.value);
    this.form.controls.shareLocation.markAsDirty();
  }

  protected discard(): void {
    const user = this.profile();
    if (!user) {
      return;
    }

    this.form.patchValue({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      shareLocation: user.shareLocation,
    });
    this.form.markAsPristine();
    this.errorMessage.set('');
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
          this.notifications.success(this.i18n.t('profile.saved'));
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.httpError(error, 'profile.saveFailed'));
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
