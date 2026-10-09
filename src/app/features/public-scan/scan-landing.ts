import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-scan-landing',
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-content class="!p-8 text-center">
        <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50">
          <mat-icon class="!h-7 !w-7 !text-3xl text-brand-600">security</mat-icon>
        </div>
        <h1 class="text-lg font-semibold text-slate-900">Use the official Tala3ny scanner</h1>
        <p class="mt-3 text-sm text-slate-500">
          To verify this Tala3ny QR code and access contact options, use the official Tala3ny
          scanner.
        </p>
        <p class="mt-4 text-xs leading-5 text-slate-400">
          Tala3ny verifies QR codes with its server. A recognized code alone does not prove that
          the sticker is still attached to the original vehicle.
        </p>

        <a
          mat-flat-button
          color="primary"
          class="!mt-6 !h-12 w-full"
          [routerLink]="scannerPath"
        >
          <mat-icon>qr_code_scanner</mat-icon>
          Open Tala3ny Scanner
        </a>
        <p class="mt-3 text-xs text-slate-400">
          The camera starts only after you press Start scanning.
        </p>
      </mat-card-content>
    </mat-card>
  `,
})
export class ScanLanding {
  readonly token = input.required<string>();

  protected readonly scannerPath = environment.officialScannerPath;
}
