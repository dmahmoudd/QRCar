import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
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
import { CarStickerCard } from './car-sticker-card';

@Component({
  selector: 'app-car-detail',
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule, TranslatePipe, CarStickerCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-detail.html',
})
export class CarDetail {
  readonly carId = input.required<string>();

  private readonly carsApi = inject(CarsApiService);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

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
        this.errorMessage.set(this.i18n.httpError(error, 'cars.loadCarFailed'));
      },
    });
  }

  protected onRotated(): void {
    this.load(this.carId());
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
        this.notifications.success(
          this.i18n.t('cars.removed', { plate: car.nickname || car.plateNumber }),
        );
        void this.router.navigate(['/cars']);
      },
      error: (error: unknown) =>
        this.notifications.error(this.i18n.httpError(error, 'cars.removeFailed')),
    });
  }
}
