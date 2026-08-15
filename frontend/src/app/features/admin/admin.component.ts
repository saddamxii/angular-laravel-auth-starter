import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { environment } from '../../environments/environment';

interface AdminUser { id: number; first_name: string; last_name: string; email: string; is_active: boolean; roles: { name: string }[]; }

@Component({ selector: 'app-admin', standalone: true, imports: [RouterLink, MatButtonModule, MatCardModule, MatTableModule], template: `
<main class="page"><section class="shell"><header><div><a routerLink="/dashboard">← Dashboard</a><p class="eyebrow">Administration</p><h1>User management</h1><p>Manage users and access from one reusable administration screen.</p></div><button mat-stroked-button (click)="load()">Refresh</button></header>
<mat-card appearance="outlined"><mat-card-content><div class="table-wrap"><table mat-table [dataSource]="users()">
<ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let u">{{u.first_name}} {{u.last_name}}</td></ng-container>
<ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let u">{{u.email}}</td></ng-container>
<ng-container matColumnDef="roles"><th mat-header-cell *matHeaderCellDef>Roles</th><td mat-cell *matCellDef="let u">{{roleNames(u)}}</td></ng-container>
<ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let u">{{u.is_active ? 'Active' : 'Disabled'}}</td></ng-container>
<tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr></table></div>
@if (error()) { <p class="error" role="alert">{{error()}}</p> } @if (!loading() && !users().length && !error()) { <p>No users found.</p> }</mat-card-content></mat-card></section></main>`,
styles: `.page{min-height:100dvh;padding:24px;background:#f7f9fc}.shell{max-width:1100px;margin:auto;display:grid;gap:24px}header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}a{text-decoration:none}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;font-weight:800;margin-top:28px}h1{margin:.2em 0;font-size:clamp(2rem,5vw,3.2rem)}.table-wrap{overflow:auto}.error{color:#b42318}@media(max-width:700px){header{flex-direction:column}table{min-width:680px}}`, changeDetection: ChangeDetectionStrategy.OnPush })
export class AdminComponent implements OnInit { private readonly http=inject(HttpClient); readonly users=signal<AdminUser[]>([]); readonly loading=signal(false); readonly error=signal<string|null>(null); readonly columns=['name','email','roles','status']; ngOnInit():void{this.load();} load():void{this.loading.set(true);this.error.set(null);this.http.get<{users:AdminUser[]}>(`${environment.apiUrl}/admin/users`).subscribe({next:r=>this.users.set(r.users),error:()=>this.error.set('Unable to load users. Check your administrator permissions.'),complete:()=>this.loading.set(false)});} roleNames(user:AdminUser):string{return user.roles.map(r=>r.name).join(', ')||'user';} }
