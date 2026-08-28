import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth/auth.service';
import { TranslationService } from '../i18n/translation.service';
import { BrandIdentityComponent } from '../branding/brand-identity.component';
import { SidebarStateService } from './sidebar-state.service';

@Component({
  selector: 'app-sidebar', standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, BrandIdentityComponent],
  templateUrl: './app-sidebar.component.html', styleUrls: ['./app-sidebar.component.scss', './app-sidebar.overrides.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  readonly sidebar = inject(SidebarStateService);
  readonly mobileOpen = signal(false);
  readonly administrationOpen = signal(this.router.url.startsWith('/admin'));
  readonly settingsOpen = signal(this.router.url.startsWith('/settings'));

  toggle(): void { this.sidebar.toggle(); }
  toggleMobile(): void { this.mobileOpen.update((value) => !value); }
  closeMobile(): void { this.mobileOpen.set(false); }
  toggleAdministration(): void {
    if (this.sidebar.collapsed()) {
      this.sidebar.setCollapsed(false);
    }
    this.administrationOpen.update((value) => !value);
  }
  toggleSettings(): void {
    if (this.sidebar.collapsed()) {
      this.sidebar.setCollapsed(false);
    }
    this.settingsOpen.update((value) => !value);
  }
  logout(): void { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }
}
