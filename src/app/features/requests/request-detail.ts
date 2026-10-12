import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocalDatePipe } from '../../core/i18n/local-date.pipe';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  ParkingRequest,
  ParkingResponseType,
  RESPONSE_OPTIONS,
} from '../../core/models/parking-request.models';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { StatusChip } from '../../shared/ui/status-chip';

@Component({
  selector: 'app-request-detail',
  imports: [
    RouterLink,
    LocalDatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusChip,
    RelativeTimePipe,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-detail.html',
})
export class RequestDetail {
  readonly requestId = input.required<string>();

  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  protected readonly responseOptions = computed(() => {
    this.i18n.locale();
    return RESPONSE_OPTIONS.map((option) => ({
      ...option,
      label: this.i18n.response(option.value),
    }));
  });

  protected readonly request = signal<ParkingRequest | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const requestId = this.requestId();
      if (requestId) {
        this.load(requestId);
      }
    });
  }

  private load(requestId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // This GET also marks the request as seen server-side.
    this.requestsApi.getById(requestId).subscribe({
      next: (request) => {
        this.request.set(request);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.httpError(error, 'requests.loadOneFailed'));
      },
    });
  }

  protected isOpen(request: ParkingRequest): boolean {
    return request.status === 'Pending' || request.status === 'Seen';
  }

  protected reasonLabel(request: ParkingRequest): string {
    return this.i18n.reason(request.reason, request.reasonLabel);
  }

  protected responseLabel(responseType: ParkingResponseType | null): string {
    return this.i18n.response(responseType);
  }

  protected statusShort(status: string): string {
    return this.i18n.statusShort(status);
  }

  protected respond(responseType: ParkingResponseType): void {
    this.saving.set(true);

    this.requestsApi.respond(this.requestId(), responseType).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success(this.i18n.t('requests.replySent'));
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(this.i18n.httpError(error, 'requests.replyFailed'));
      },
    });
  }

  protected resolve(): void {
    this.saving.set(true);

    this.requestsApi.resolve(this.requestId()).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success(this.i18n.t('requests.markedResolved'));
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(this.i18n.httpError(error, 'requests.resolveFailed'));
      },
    });
  }
}
