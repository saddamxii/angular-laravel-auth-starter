import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <main class="state-page">
      <h1>403</h1>
      <p>You do not have permission to access this resource.</p>
      <a mat-flat-button routerLink="/dashboard">Back to dashboard</a>
    </main>
  `,
  styles: `.state-page { min-height:100dvh; display:grid; place-content:center; text-align:center; gap:12px; padding:24px; } h1 { font-size:clamp(4rem,15vw,8rem); margin:0; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {}
