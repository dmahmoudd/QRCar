import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CarsApiService } from '../../core/api/cars-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { Car } from '../../core/models/car.models';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';

@Component({
  selector: 'app-car-list',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PageHeader,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="My cars" subtitle="Each car gets its own printable QR code.">
      <button mat-flat-button color="primary" routerLink="/cars/new">
        <mat-icon>add</mat-icon>
        Add car
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (cars().length === 0) {
      <mat-card>
        <app-empty-state
          icon="directions_car"
          title="No cars yet"
          description="Register a car to generate the QR code that lets people reach you without your number."
        >
          <button mat-flat-button color="primary" class="!mt-2" routerLink="/cars/new">
            <mat-icon>add</mat-icon>
            Add your first car
          </button>
        </app-empty-state>
      </mat-card>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (car of cars(); track car.id) {
          <mat-card class="!p-5">
            <div class="flex items-start justify-between gap-2">
              <a [routerLink]="['/cars', car.id]" class="min-w-0 flex-1">
                <p class="truncate font-semibold text-slate-900">
                  {{ car.nickname || 'QR code' }}
                </p>
                <p class="mt-0.5 font-mono text-sm text-slate-500">{{ car.plateNumber }}</p>
              </a>

              <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Car actions">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item [routerLink]="['/cars', car.id]">
                  <mat-icon>qr_code_2</mat-icon>
                  <span>QR code</span>
                </button>
                <button mat-menu-item [routerLink]="['/cars', car.id, 'edit']">
                  <mat-icon>edit</mat-icon>
                  <span>Edit details</span>
                </button>
                <button mat-menu-item (click)="confirmDelete(car)">
                  <mat-icon>delete_outline</mat-icon>
                  <span>Remove car</span>
                </button>
              </mat-menu>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <p class="text-xs text-slate-400">
                {{ car.scanCount }} scans · v{{ car.qrVersion }}
              </p>
              @if (!car.isActive) {
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  Paused
                </span>
              }
            </div>
          </mat-card>
        }
      </div>
    }
  `,
})
export class CarList {
  private readonly carsApi = inject(CarsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly cars = signal<Car[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);

    this.carsApi.list(1, 100).subscribe({
      next: (result) => {
        this.cars.set(result.items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load your cars.'));
      },
    });
  }

  protected confirmDelete(car: Car): void {
    const data: ConfirmDialogData = {
      title: `Remove ${car.plateNumber}?`,
      message:
        'The QR code for this car stops working straight away, so any sticker still on the windscreen will show a "no longer active" page. Past requests are kept.',
      confirmLabel: 'Remove car',
      destructive: true,
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '440px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.delete(car);
        }
      });
  }

  private delete(car: Car): void {
    this.carsApi.delete(car.id).subscribe({
      next: () => {
        this.cars.update((cars) => cars.filter((item) => item.id !== car.id));
        this.notifications.success(`${car.plateNumber} removed.`);
      },
      error: (error: unknown) =>
        this.notifications.error(extractErrorMessage(error, 'Could not remove the car.')),
    });
  }
}
