import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CarsApiService } from '../../core/api/cars-api.service';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { Car } from '../../core/models/car.models';
import { ParkingRequest } from '../../core/models/parking-request.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusChip } from '../../shared/ui/status-chip';

@Component({
  selector: 'app-dashboard',
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
      [title]="greeting()"
      subtitle="Here's what's happening with your cars right now."
    >
      <button mat-flat-button color="primary" routerLink="/cars/new">
        <mat-icon>add</mat-icon>
        Add car
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="grid h-64 place-items-center">
        <mat-spinner diameter="40" />
      </div>
    } @else if (errorMessage()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-3">
        <mat-card class="!p-5">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Cars registered</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ cars().length }}</p>
        </mat-card>

        <mat-card class="!p-5">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Needs your reply</p>
          <p class="mt-2 text-3xl font-semibold" [class]="pendingCount() ? 'text-amber-600' : 'text-slate-900'">
            {{ pendingCount() }}
          </p>
        </mat-card>

        <mat-card class="!p-5">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Total scans</p>
          <p class="mt-2 text-3xl font-semibold text-slate-900">{{ totalScans() }}</p>
        </mat-card>
      </div>

      <section class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Recent requests</h2>
          @if (requests().length) {
            <a class="text-sm font-medium text-brand-600 hover:underline" routerLink="/requests">
              View all
            </a>
          }
        </div>

        <mat-card>
          @if (requests().length === 0) {
            <app-empty-state
              icon="notifications_off"
              title="No requests yet"
              description="When someone scans one of your QR codes and asks you to move, it will show up here."
            />
          } @else {
            <ul class="divide-y divide-slate-100">
              @for (request of requests().slice(0, 5); track request.id) {
                <li>
                  <a
                    class="flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50"
                    [routerLink]="['/requests', request.id]"
                  >
                    <div class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                      <mat-icon class="!h-5 !w-5 !text-xl">directions_car</mat-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="font-medium text-slate-900">{{ request.reasonLabel }}</p>
                        <app-status-chip [status]="request.status" />
                      </div>
                      <p class="mt-0.5 text-sm text-slate-500">
                        {{ request.carPlate }} · {{ request.createdAtUtc | relativeTime }}
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
          }
        </mat-card>
      </section>

      <section class="mt-8">
        <h2 class="mb-3 text-lg font-semibold text-slate-900">Your cars</h2>

        @if (cars().length === 0) {
          <mat-card>
            <app-empty-state
              icon="directions_car"
              title="Add your first car"
              description="Register a car to get a unique QR code you can print and put on the windscreen."
            >
              <button mat-flat-button color="primary" class="!mt-2" routerLink="/cars/new">
                <mat-icon>add</mat-icon>
                Add car
              </button>
            </app-empty-state>
          </mat-card>
        } @else {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (car of cars(); track car.id) {
              <a [routerLink]="['/cars', car.id]" class="block">
                <mat-card class="h-full !p-5 transition hover:shadow-md">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-slate-900">
                        {{ car.nickname || 'QR code' }}
                      </p>
                      <p class="mt-0.5 font-mono text-sm text-slate-500">{{ car.plateNumber }}</p>
                    </div>
                    @if (!car.isActive) {
                      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Paused
                      </span>
                    }
                  </div>
                  <p class="mt-4 text-xs text-slate-400">
                    v{{ car.qrVersion }} · {{ car.scanCount }} scans
                  </p>
                </mat-card>
              </a>
            }
          </div>
        }
      </section>
    }
  `,
})
export class Dashboard {
  private readonly carsApi = inject(CarsApiService);
  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly auth = inject(AuthService);

  protected readonly cars = signal<Car[]>([]);
  protected readonly requests = signal<ParkingRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly greeting = computed(() => {
    const name = this.auth.user()?.fullName?.split(' ')[0];
    return name ? `Hello, ${name}` : 'Dashboard';
  });

  protected readonly pendingCount = computed(
    () => this.requests().filter((request) => request.status === 'Pending').length,
  );

  protected readonly totalScans = computed(() =>
    this.cars().reduce((total, car) => total + car.scanCount, 0),
  );

  constructor() {
    forkJoin({
      cars: this.carsApi.list(1, 50),
      requests: this.requestsApi.list({}, 1, 20),
    }).subscribe({
      next: ({ cars, requests }) => {
        this.cars.set(cars.items);
        this.requests.set(requests.items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load your dashboard.'));
      },
    });
  }
}
