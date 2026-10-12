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
  templateUrl: './dashboard.html',
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
