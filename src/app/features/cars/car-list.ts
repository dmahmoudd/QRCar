import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { CarsApiService } from '../../core/api/cars-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Car } from '../../core/models/car.models';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { CarStickerCard } from './car-sticker-card';

@Component({
  selector: 'app-car-list',
  imports: [
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
    TranslatePipe,
    CarStickerCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-list.html',
})
export class CarList {
  private readonly carsApi = inject(CarsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

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
        if (result.items.length === 1) {
          void this.router.navigate(['/cars', result.items[0].id], { replaceUrl: true });
          return;
        }

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
      title: this.i18n.t('cars.removeTitle', { plate: car.nickname || car.plateNumber }),
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
        this.notifications.success(
          this.i18n.t('cars.removed', { plate: car.nickname || car.plateNumber }),
        );
      },
      error: (error: unknown) =>
        this.notifications.error(this.i18n.httpError(error, 'cars.removeFailed')),
    });
  }
}
