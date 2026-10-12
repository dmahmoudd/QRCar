import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { CarsApiService } from '../../core/api/cars-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'app-car-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    PageHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-form.html',
})
export class CarForm {
  readonly carId = input<string>('');
  readonly welcome = input<string>('');

  private readonly carsApi = inject(CarsApiService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isEdit = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    nickname: ['', [Validators.maxLength(48)]],
    isActive: [true],
  });

  constructor() {
    effect(() => {
      const carId = this.carId();
      this.isEdit.set(!!carId);

      if (carId) {
        this.loadCar(carId);
      }
    });
  }

  private loadCar(carId: string): void {
    this.loading.set(true);

    this.carsApi.getById(carId).subscribe({
      next: (car) => {
        this.form.patchValue({
          nickname: car.nickname ?? '',
          isActive: car.isActive,
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load this QR code.'));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const nickname = this.form.controls.nickname.value.trim() || null;
    const carId = this.carId();

    const request = carId
      ? this.carsApi.update(carId, { nickname, isActive: this.form.controls.isActive.value })
      : this.carsApi.create({ nickname });

    request.subscribe({
      next: (car) => {
        this.notifications.success(carId ? 'Saved.' : 'QR code created. Print it from the next screen.');
        void this.router.navigate(['/cars', car.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not save this QR code.'));
      },
    });
  }

  protected cancel(): void {
    void this.router.navigate(this.carId() ? ['/cars', this.carId()] : ['/cars']);
  }
}
