import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
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
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusChip,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-detail.html',
})
export class RequestDetail {
  readonly requestId = input.required<string>();

  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly notifications = inject(NotificationService);

  protected readonly responseOptions = RESPONSE_OPTIONS;
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
        this.errorMessage.set(extractErrorMessage(error, 'Could not load this request.'));
      },
    });
  }

  protected isOpen(request: ParkingRequest): boolean {
    return request.status === 'Pending' || request.status === 'Seen';
  }

  protected responseLabel(responseType: ParkingResponseType | null): string {
    return RESPONSE_OPTIONS.find((option) => option.value === responseType)?.label ?? '—';
  }

  protected respond(responseType: ParkingResponseType): void {
    this.saving.set(true);

    this.requestsApi.respond(this.requestId(), responseType).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success('Reply sent. They can see it now.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(extractErrorMessage(error, 'Could not send your reply.'));
      },
    });
  }

  protected resolve(): void {
    this.saving.set(true);

    this.requestsApi.resolve(this.requestId()).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success('Marked as resolved.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(extractErrorMessage(error, 'Could not resolve this request.'));
      },
    });
  }
}
