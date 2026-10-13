import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Car } from '../../core/models/car.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { QrPanel } from '../qr/qr-panel';

@Component({
  selector: 'app-car-sticker-card',
  imports: [RouterLink, MatIconModule, MatMenuModule, TranslatePipe, RelativeTimePipe, QrPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './car-sticker-card.html',
})
export class CarStickerCard {
  readonly car = input.required<Car>();
  readonly remove = output<Car>();
  readonly rotated = output<void>();
}
