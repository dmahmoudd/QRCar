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
  template: `
    <app-page-header
      title="Requests"
      subtitle="Messages from people who scanned one of your QR codes."
    />

    <div class="mb-4 flex flex-wrap gap-2">
      @for (filter of filters; track filter.value) {
        <button
          type="button"
          class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
          [class]="
            activeFilter() === filter.value
              ? 'bg-brand-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          "
          (click)="setFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (requests().length === 0) {
      <mat-card>
        <app-empty-state
          icon="notifications_off"
          [title]="activeFilter() ? 'Nothing in this view' : 'No requests yet'"
          description="When someone scans your code and asks you to move, it appears here."
        />
      </mat-card>
    } @else {
      <mat-card>
        <ul class="divide-y divide-slate-100">
          @for (request of requests(); track request.id) {
            <li>
              <a
                class="flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50"
                [routerLink]="['/requests', request.id]"
              >
                <div
                  class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  [class]="
                    request.status === 'Pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-slate-100 text-slate-500'
                  "
                >
                  <mat-icon class="!h-5 !w-5 !text-xl">notifications</mat-icon>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-slate-900">{{ request.reasonLabel }}</p>
                    <app-status-chip [status]="request.status" />
                  </div>
                  <p class="mt-0.5 text-sm text-slate-500">
                    {{ request.carLabel }} · {{ request.carPlate }} ·
                    {{ request.createdAtUtc | relativeTime }}
                  </p>
                  @if (request.message) {
                    <p class="mt-1 line-clamp-2-safe text-sm text-slate-600">
                      "{{ request.message }}"
                    </p>
                  }
                </div>

                <mat-icon class="mt-1 shrink-0 text-slate-300">chevron_right</mat-icon>
              </a>
            </li>
          }
        </ul>
      </mat-card>
    }
  `,
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
