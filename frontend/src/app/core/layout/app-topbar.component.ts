import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth/auth.service';
import { LanguageSelectorComponent } from '../i18n/language-selector.component';
import { SidebarStateService } from './sidebar-state.service';
import { ThemeStateService } from './theme-state.service';

@Component({
  selector: 'app-topbar', standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, LanguageSelectorComponent],
  templateUrl: './app-topbar.component.html', styleUrl: './app-topbar.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTopbarComponent {
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  readonly theme = inject(ThemeStateService);
}
