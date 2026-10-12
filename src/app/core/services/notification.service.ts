import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { I18nService } from '../i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18nService);

  success(message: string): void {
    this.snackBar.open(message, this.i18n.t('common.dismiss'), {
      duration: 4000,
      panelClass: 'app-snack-success',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, this.i18n.t('common.dismiss'), {
      duration: 8000,
      panelClass: 'app-snack-error',
    });
  }
}
