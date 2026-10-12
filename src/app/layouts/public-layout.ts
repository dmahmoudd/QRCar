import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';

/**
 * Chrome for the anonymous scan pages. No owner-app menus — only a Scan entry so a
 * stranger can open the in-app camera without signing in.
 */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-layout.html',
})
export class PublicLayout {}
