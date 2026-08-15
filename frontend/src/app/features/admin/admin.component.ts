import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { environment } from '../../../environments/environment';

interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles: { name: string }[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatTableModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly columns = ['name', 'email', 'roles', 'status'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<{ users: AdminUser[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (response) => this.users.set(response.users),
      error: () => this.error.set('Unable to load users. Check your administrator permissions.'),
      complete: () => this.loading.set(false),
    });
  }

  roleNames(user: AdminUser): string {
    return user.roles.map((role) => role.name).join(', ') || 'user';
  }
}
