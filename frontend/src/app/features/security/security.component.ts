import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Passkeys } from '@laravel/passkeys';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <main class="security-page">
      <section class="security-card">
        <a routerLink="/dashboard">← Dashboard</a>
        <h1>Security</h1>
        <p>Add a passkey to use Face ID, Touch ID, fingerprint, Windows Hello, or another device authenticator.</p>

        <mat-form-field appearance="outline">
          <mat-label>Passkey name</mat-label>
          <input matInput [value]="name()" (input)="name.set($any($event.target).value)" placeholder="My laptop" />
        </mat-form-field>

        <button mat-flat-button (click)="addPasskey()" [disabled]="!name().trim() || loading()">
          {{ loading() ? 'Waiting for device…' : 'Add passkey' }}
        </button>

        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </section>
    </main>
  `,
  styles: `
    .security-page { min-height:100dvh; display:grid; place-items:center; padding:24px; background:#f7f9fc; }
    .security-card { width:min(100%,640px); padding:40px; background:#fff; border-radius:24px; box-shadow:0 24px 70px rgb(20 34 66 / 10%); display:grid; gap:16px; }
    .security-card a { text-decoration:none; }
    .security-card h1 { margin:0; }
    .error { color:#b42318; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent {
  readonly name = signal('My device');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async addPasskey(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);

    try {
      await Passkeys.register({ name: this.name().trim() });
      this.message.set('Passkey registered successfully.');
    } catch {
      this.error.set('The passkey could not be registered. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
