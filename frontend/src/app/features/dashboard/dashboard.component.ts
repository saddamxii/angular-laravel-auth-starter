import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppSidebarComponent } from '../../core/layout/app-sidebar.component';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { AppTopbarComponent } from '../../core/layout/app-topbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AppSidebarComponent, AppTopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly sidebar = inject(SidebarStateService);
}
