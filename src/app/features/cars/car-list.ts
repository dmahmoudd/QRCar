import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CarsApiService } from '../../core/api/cars-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
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
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-list.html',
})
export class CarList {
  private readonly carsApi = inject(CarsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

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
        this.errorMessage.set(this.i18n.httpError(error, 'cars.loadFailed'));
      },
    });
  }

  protected confirmDelete(car: Car): void {
    const data: ConfirmDialogData = {
      title: this.i18n.t('cars.removeTitle', { plate: car.plateNumber }),
      message: this.i18n.t('cars.removeMessage'),
      confirmLabel: this.i18n.t('cars.remove'),
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
        this.notifications.success(this.i18n.t('cars.removed', { plate: car.plateNumber }));
      },
      error: (error: unknown) =>
        this.notifications.error(this.i18n.httpError(error, 'cars.removeFailed')),
    });
  }
}
