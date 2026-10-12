import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { CarsApiService } from '../../core/api/cars-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { Car } from '../../core/models/car.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { PageHeader } from '../../shared/ui/page-header';
import { QrPanel } from '../qr/qr-panel';

@Component({
  selector: 'app-car-detail',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeader,
    QrPanel,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-detail.html',
})
export class CarDetail {
  readonly carId = input.required<string>();

  private readonly carsApi = inject(CarsApiService);

  protected readonly car = signal<Car | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const carId = this.carId();
      if (carId) {
        this.load(carId);
      }
    });
  }

  private load(carId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.carsApi.getById(carId).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load this car.'));
      },
    });
  }

  /** Rotation resets the scan counter and bumps the version, so refresh the detail panel. */
  protected onRotated(): void {
    this.load(this.carId());
  }
}
