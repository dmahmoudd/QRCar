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
  template: `
    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (car(); as vehicle) {
      <app-page-header
        [title]="vehicle.nickname || 'QR code'"
        subtitle="Anyone who scans this can contact you without seeing your full number."
      >
        <button mat-stroked-button [routerLink]="['/cars', vehicle.id, 'edit']">
          <mat-icon>edit</mat-icon>
          Edit
        </button>
        <button mat-stroked-button [routerLink]="['/requests']" [queryParams]="{ carId: vehicle.id }">
          <mat-icon>notifications</mat-icon>
          Requests
        </button>
      </app-page-header>

      <div class="grid gap-6 lg:grid-cols-2">
        <app-qr-panel
          [carId]="vehicle.id"
          [plateNumber]="vehicle.plateNumber"
          (rotated)="onRotated()"
        />

        <mat-card>
          <mat-card-header class="!px-6 !pt-6">
            <mat-card-title class="text-lg font-semibold">Details</mat-card-title>
          </mat-card-header>

          <mat-card-content class="!px-6 !pb-6">
            <dl class="divide-y divide-slate-100">
              <div class="flex justify-between py-3">
                <dt class="text-sm text-slate-500">Status</dt>
                <dd class="text-sm text-slate-900">{{ vehicle.isActive ? 'Active' : 'Paused' }}</dd>
              </div>
              <div class="flex justify-between py-3">
                <dt class="text-sm text-slate-500">Times scanned</dt>
                <dd class="text-sm text-slate-900">{{ vehicle.scanCount }}</dd>
              </div>
              <div class="flex justify-between py-3">
                <dt class="text-sm text-slate-500">Last scanned</dt>
                <dd class="text-sm text-slate-900">
                  {{ vehicle.lastScannedAtUtc ? (vehicle.lastScannedAtUtc | relativeTime) : 'Never' }}
                </dd>
              </div>
              <div class="flex justify-between py-3">
                <dt class="text-sm text-slate-500">Added</dt>
                <dd class="text-sm text-slate-900">{{ vehicle.createdAtUtc | relativeTime }}</dd>
              </div>
            </dl>

            <div class="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
              Scanners see the phone number on your profile. Turn on location sharing there if
              you also want them to see your last reported position.
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
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
