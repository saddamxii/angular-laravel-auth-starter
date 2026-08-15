import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <main class="dashboard">
      <div class="content">
        <p class="eyebrow">Authenticated</p>
        <h1>Welcome, {{ auth.user()?.first_name }}</h1>
        <p>Your reusable authentication foundation is working.</p>
        <button mat-flat-button (click)="logout()">Sign out</button>
      </div>
    </main>
  `,
  styles: `
    .dashboard { min-height: 100dvh; display:grid; place-items:center; padding:24px; background:#f7f9fc; }
    .content { width:min(100%,720px); padding:48px; border-radius:24px; background:#fff; box-shadow:0 24px 70px rgb(20 34 66 / 10%); }
    .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:.75rem; font-weight:800; }
    h1 { font-size:clamp(2rem,6vw,3.5rem); margin:.3em 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
