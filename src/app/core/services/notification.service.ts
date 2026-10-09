import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 4000,
      panelClass: 'app-snack-success',
    });
  }

  error(message: string): void {
    // Errors stay on screen longer: they usually require the user to do something.
    this.snackBar.open(message, 'Dismiss', {
      duration: 8000,
      panelClass: 'app-snack-error',
    });
  }
}
