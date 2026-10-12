import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  ParkingRequest,
  ParkingRequestStatus,
  ParkingResponseType,
  RESPONSE_OPTIONS,
} from '../../core/models/parking-request.models';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { EmptyState } from '../../shared/ui/empty-state';

const FILTERS: ReadonlyArray<{ labelKey: string; value: ParkingRequestStatus | '' }> = [
  { labelKey: 'requests.filterAll', value: '' },
  { labelKey: 'requests.filterWaiting', value: 'Pending' },
  { labelKey: 'requests.filterSeen', value: 'Seen' },
  { labelKey: 'requests.filterReplied', value: 'Acknowledged' },
  { labelKey: 'requests.filterResolved', value: 'Resolved' },
];

@Component({
  selector: 'app-request-inbox',
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule, EmptyState, RelativeTimePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-inbox.html',
})
export class RequestInbox {
  readonly carId = input<string>('');

  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  protected readonly filters = FILTERS;
  protected readonly requests = signal<ParkingRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly activeFilter = signal<ParkingRequestStatus | ''>('');
  protected readonly busyId = signal<string | null>(null);

  protected readonly responseOptions = computed(() => {
    this.i18n.locale();
    return RESPONSE_OPTIONS.map((option) => ({
      ...option,
      label: this.i18n.response(option.value),
    }));
  });

  constructor() {
    effect(() => {
      const carId = this.carId();
      const status = this.activeFilter();
      this.load(status, carId);
    });
  }

  protected setFilter(status: ParkingRequestStatus | ''): void {
    this.activeFilter.set(status);
  }

  protected reasonLabel(request: ParkingRequest): string {
    return this.i18n.reason(request.reason, request.reasonLabel);
  }

  protected carTitle(request: ParkingRequest): string {
    return request.carLabel?.trim() || this.i18n.t('common.qrCode');
  }

  protected statusLabel(status: ParkingRequestStatus): string {
    return this.i18n.status(status);
  }

  protected responseLabel(responseType: ParkingResponseType | null): string {
    return this.i18n.response(responseType);
  }

  protected isOpen(request: ParkingRequest): boolean {
    return request.status === 'Pending' || request.status === 'Seen';
  }

  protected statusClasses(status: ParkingRequestStatus): string {
    switch (status) {
      case 'Pending':
        return 'bg-tertiary-fixed text-on-tertiary-fixed';
      case 'Seen':
        return 'bg-primary-container/20 text-on-primary-container';
      case 'Acknowledged':
        return 'bg-secondary-container text-on-secondary-container';
      case 'Expired':
        return 'bg-error-container text-on-error-container';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  }

  protected respond(request: ParkingRequest, responseType: ParkingResponseType): void {
    this.busyId.set(request.id);
    this.requestsApi.respond(request.id, responseType).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busyId.set(null);
        this.notifications.success(this.i18n.t('requests.replySent'));
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notifications.error(this.i18n.httpError(error, 'requests.replyFailed'));
      },
    });
  }

  protected resolve(request: ParkingRequest): void {
    this.busyId.set(request.id);
    this.requestsApi.resolve(request.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busyId.set(null);
        this.notifications.success(this.i18n.t('requests.markedResolved'));
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notifications.error(this.i18n.httpError(error, 'requests.resolveFailed'));
      },
    });
  }

  private replace(updated: ParkingRequest): void {
    this.requests.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  private load(status: ParkingRequestStatus | '', carId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.requestsApi
      .list(
        {
          status: status || undefined,
          carId: carId || undefined,
        },
        1,
        50,
      )
      .subscribe({
        next: (result) => {
          this.requests.set(result.items);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.i18n.httpError(error, 'requests.loadFailed'));
        },
      });
  }
}
