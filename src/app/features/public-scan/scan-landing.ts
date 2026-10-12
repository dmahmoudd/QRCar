import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-scan-landing',
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-landing.html',
})
export class ScanLanding {
  readonly token = input.required<string>();

  protected readonly scannerPath = environment.officialScannerPath;
}
