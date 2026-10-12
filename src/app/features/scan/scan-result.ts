import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { OfficialScan } from '../../core/models/public-scan.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-scan-result',
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-result.html',
})
export class ScanResult {
  readonly scan = input<OfficialScan | null>(null);
  readonly unrecognized = input(false);
  readonly notFound = input(false);
  readonly retired = input(false);
  readonly paused = input(false);
  readonly errorMessage = input('');

  private readonly publicApi = inject(PublicScanApiService);

  protected readonly callUrl = computed(() => {
    const scanId = this.scan()?.scanId;
    return scanId ? this.publicApi.callUrl(scanId) : '';
  });

  protected readonly whatsAppUrl = computed(() => {
    const scanId = this.scan()?.scanId;
    return scanId ? this.publicApi.whatsAppUrl(scanId) : '';
  });

  protected readonly mapsUrl = computed(() => {
    const current = this.scan();
    if (!current?.shareLocation || current.lastLatitude == null || current.lastLongitude == null) {
      return null;
    }

    return `https://www.google.com/maps?q=${current.lastLatitude},${current.lastLongitude}`;
  });
}
