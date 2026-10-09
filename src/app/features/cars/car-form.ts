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
  template: `
    <app-page-header
      [title]="isEdit() ? 'Edit QR code' : 'Create a QR code'"
      [subtitle]="
        isEdit()
          ? 'This sticker shows your phone number to anyone who scans it.'
          : 'Print the code and put it where someone can scan it. They will see your number.'
      "
    />

    @if (welcome() && !isEdit()) {
      <div class="mb-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <mat-icon class="!h-5 !w-5 !text-xl">check_circle</mat-icon>
        <span>
          Account created. Create a QR code now. Scanners can call you without seeing the full
          number.
        </span>
      </div>
    }

    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-card class="max-w-xl">
        <mat-card-content class="!p-6">
          @if (errorMessage()) {
            <div class="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              <mat-icon class="!h-5 !w-5 !text-xl">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-2">
            <mat-form-field appearance="outline">
              <mat-label>Label (optional)</mat-label>
              <input matInput formControlName="nickname" placeholder="Windscreen, bag, keys…" />
              <mat-hint>Only you see this. Helps if you print more than one code.</mat-hint>
            </mat-form-field>

            @if (isEdit()) {
              <div class="mt-2 rounded-lg bg-slate-50 p-4">
                <mat-slide-toggle formControlName="isActive">Code is active</mat-slide-toggle>
                <p class="mt-1 text-xs text-slate-500">
                  When off, the sticker no longer shows your number as a live contact.
                </p>
              </div>
            }

            <div class="mt-4 flex gap-2">
              <button mat-flat-button color="primary" class="!h-11" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : isEdit() ? 'Save' : 'Create QR code' }}
              </button>
              <button mat-stroked-button class="!h-11" type="button" (click)="cancel()">
                Cancel
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
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
