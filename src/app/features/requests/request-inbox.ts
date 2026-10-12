import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { ParkingRequest, ParkingRequestStatus } from '../../core/models/parking-request.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';

const FILTERS: ReadonlyArray<{ label: string; value: ParkingRequestStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Waiting', value: 'Pending' },
  { label: 'Seen', value: 'Seen' },
  { label: 'Replied', value: 'Acknowledged' },
  { label: 'Resolved', value: 'Resolved' },
];

@Component({
  selector: 'app-request-inbox',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeader,
    EmptyState,
    StatusChip,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-inbox.html',
})
export class RequestInbox {
  /** Optional query param, set when arriving from a specific car. */
  readonly carId = input<string>('');

  private readonly requestsApi = inject(ParkingRequestsApiService);

  protected readonly filters = FILTERS;
  protected readonly requests = signal<ParkingRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly activeFilter = signal<ParkingRequestStatus | ''>('');

  constructor() {
    // Re-runs whenever the carId query param or the chosen status filter changes.
    effect(() => {
      const carId = this.carId();
      const status = this.activeFilter();
      this.load(status, carId);
    });
  }

  protected setFilter(status: ParkingRequestStatus | ''): void {
    this.activeFilter.set(status);
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
          this.errorMessage.set(extractErrorMessage(error, 'Could not load your requests.'));
        },
      });
  }
}
