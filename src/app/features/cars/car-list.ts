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
  templateUrl: './car-list.html',
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
      .open(ConfirmDialog, { data, width: 'min(440px, calc(100vw - 24px))' })
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
