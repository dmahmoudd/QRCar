import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

/**
 * Chrome for the anonymous scan pages. Intentionally has no navigation, no sign-in prompt and
 * no link into the owner app: whoever scanned a sticker is a stranger, not a user.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-slate-50">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <mat-icon class="text-brand-600">qr_code_2</mat-icon>
          <span class="font-semibold tracking-tight text-slate-800">Park Ping</span>
        </div>
      </header>

      <main class="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <router-outlet />
      </main>

      <footer class="px-4 py-6 text-center text-xs text-slate-400">
        The owner's phone number is never shared.
      </footer>
    </div>
  `,
})
export class PublicLayout {}
