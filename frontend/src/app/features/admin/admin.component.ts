import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { AppSidebarComponent } from '../../core/layout/app-sidebar.component';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { AppTopbarComponent } from '../../core/layout/app-topbar.component';
import { ExcelExportService } from '../../core/export/excel-export.service';

interface Permission { id: number; name: string; display_name: string; }
interface AdminRole { id: number; name: string; display_name: string; permissions: Permission[]; }
interface AdminUser { id: number; first_name: string; last_name: string; username: string | null; email: string; is_active: boolean; roles: AdminRole[]; }
interface AuditLog { id: number; user_id: number | null; event: string; ip_address: string | null; user_agent: string | null; metadata: Record<string, unknown> | null; created_at: string; user: Pick<AdminUser, 'id' | 'first_name' | 'last_name' | 'email'> | null; }
interface AuditLogResponse { data: AuditLog[]; current_page: number; last_page: number; total: number; }
interface AuditOptions { events: string[]; users: Pick<AdminUser, 'id' | 'first_name' | 'last_name' | 'email'>[]; }
type TableKey = 'users' | 'roles' | 'audit';

@Component({
  selector: 'app-admin', standalone: true,
  imports: [FormsModule, DatePipe, MatButtonModule, MatCardModule, MatIconModule, MatAutocompleteModule, AppSidebarComponent, AppTopbarComponent],
  templateUrl: './admin.component.html', styleUrls: ['./admin.component.scss', './admin-cards.component.scss', './admin-users.component.scss', './admin-roles-audit.component.scss', './admin-responsive.component.scss', './admin-dialog-compact.component.scss', './admin-role-dialog-dense.component.scss', './admin-permissions.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit {
  /**
   * Administration data flow map:
   * - ngOnInit/refresh/loadUsers/loadRoles/loadAudit* read Laravel /admin endpoints backed by users, roles,
   *   permissions, pivot tables and audit_logs, then store results in Angular signals.
   * - save, delete and mutate methods send dialogs to Laravel controllers; those controllers validate SQL writes and AuditLogger.
   * - filtering, pagination and page-navigation helpers work only on loaded browser data; export methods send visible rows to ExcelExportService.
   * - audit filter methods turn form values into /admin/audit-logs query parameters and replace auditLogs/audit page signals.
   * - selectTab changes only the frontend route; Laravel middleware is still responsible for access control.
   */
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarStateService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly excelExport = inject(ExcelExportService);
  readonly users = signal<AdminUser[]>([]);
  readonly userSearch = signal('');
  readonly userPage = signal(1);
  readonly userPageSize = signal(10);
  readonly roles = signal<AdminRole[]>([]);
  readonly roleSearch = signal('');
  readonly rolePage = signal(1);
  readonly rolePageSize = signal(10);
  readonly permissionTableSearch = signal('');
  readonly permissionPage = signal(1);
  readonly permissionPageSize = signal(10);
  readonly permissions = signal<Permission[]>([]);
  readonly activeTab = signal<'users' | 'roles' | 'audit'>('users');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly userDialogOpen = signal(false);
  readonly roleDialogOpen = signal(false);
  readonly permissionDialogOpen = signal(false);
  readonly editingUser = signal<AdminUser | null>(null);
  readonly editingRole = signal<AdminRole | null>(null);
  readonly selectedPermissions = signal<number[]>([]);
  readonly permissionSearch = signal('');
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly auditEvents = signal<string[]>([]);
  readonly auditUsers = signal<AuditOptions['users']>([]);
  readonly auditPage = signal(1);
  readonly auditPageSize = signal(10);
  readonly auditLastPage = signal(1);
  readonly auditTotal = signal(0);
  readonly auditSearch = signal('');
  readonly auditEventQuery = signal('');
  readonly auditUserQuery = signal('');
  readonly columnWidths = signal<Record<TableKey, number[]>>({ users: [], roles: [], audit: [] });
  auditFilters = { event: '', userId: '', from: '', to: '' };
  userForm = this.emptyUserForm();
  roleForm = this.emptyRoleForm();
  permissionForm = this.emptyPermissionForm();

  /** Route /admin/users|roles|audit-logs -> data.section -> selects table and starts the appropriate backend reads. */
  ngOnInit(): void {
    this.route.data.subscribe(({ section }) => {
      const tab = section === 'roles' || section === 'audit' ? section : 'users';
      this.activeTab.set(tab);
      this.message.set(null); this.error.set(null);
      this.refresh();
    });
  }
  /** Reload entry point used after route changes and mutations; destination is users/roles or audit signals. */
  refresh(): void {
    if (this.activeTab() === 'audit') {
      this.loadAuditLogs();
      this.loadAuditOptions();
      return;
    }

    this.loadUsers();
    if (this.isAdmin()) this.loadRoles();
  }
  /** Sidebar/admin tab action -> router destination; ngOnInit then reads the corresponding SQL-backed endpoint. */
  selectTab(tab: 'users' | 'roles' | 'audit'): void {
    void this.router.navigateByUrl(tab === 'users' ? '/admin/users' : tab === 'roles' ? '/admin/roles' : '/admin/audit-logs');
  }
  isAdmin(): boolean { return this.auth.hasRole('admin'); }

  /** Selected users table row -> copies its API data into the edit dialog model. */
  editUser(user: AdminUser): void {
    this.editingUser.set(user);
    this.userForm = { first_name: user.first_name, last_name: user.last_name, username: user.username ?? '', email: user.email, password: '', role: user.roles[0]?.name ?? 'user', is_active: user.is_active };
    this.userDialogOpen.set(true);
  }
  openCreateUser(): void { this.editingUser.set(null); this.userForm = this.emptyUserForm(); this.userDialogOpen.set(true); }
  cancelUserEdit(): void { this.userDialogOpen.set(false); this.editingUser.set(null); this.userForm = this.emptyUserForm(); }
  onUserDialogKeydown(event: KeyboardEvent): void { if (event.key === 'Escape') this.cancelUserEdit(); }
  /** User dialog -> POST/PUT /admin/users -> users + role_user -> mutation callback reloads the users table. */
  saveUser(): void {
    const editing = this.editingUser();
    const payload = editing
      ? {
          first_name: this.userForm.first_name,
          last_name: this.userForm.last_name,
          username: this.userForm.username,
          email: this.userForm.email,
          is_active: this.userForm.is_active,
          ...(this.isAdmin() ? { role: this.userForm.role } : {}),
        }
      : {
          ...this.userForm,
          role: this.isAdmin() ? this.userForm.role : 'user',
          password_confirmation: this.userForm.password,
        };
    this.mutate(editing ? this.http.put(`${environment.apiUrl}/admin/users/${editing.id}`, payload) : this.http.post(`${environment.apiUrl}/admin/users`, payload), editing ? 'User updated.' : 'User created.', () => { this.cancelUserEdit(); this.loadUsers(); });
  }
  /** Delete action -> DELETE /admin/users/{id} -> UserController + audit_logs -> reloads the users signal. */
  deleteUser(user: AdminUser): void {
    if (confirm(`Delete ${user.email}?`)) this.mutate(this.http.delete(`${environment.apiUrl}/admin/users/${user.id}`), 'User deleted.', () => this.loadUsers());
  }

  editRole(role: AdminRole): void {
    this.editingRole.set(role); this.roleForm = { name: role.name, display_name: role.display_name }; this.selectedPermissions.set(role.permissions.map((permission) => permission.id)); this.permissionSearch.set(''); this.roleDialogOpen.set(true); this.selectTab('roles');
  }
  openCreateRole(): void { this.editingRole.set(null); this.roleForm = this.emptyRoleForm(); this.selectedPermissions.set([]); this.permissionSearch.set(''); this.roleDialogOpen.set(true); }
  cancelRoleEdit(): void { this.roleDialogOpen.set(false); this.editingRole.set(null); this.roleForm = this.emptyRoleForm(); this.selectedPermissions.set([]); this.permissionSearch.set(''); }
  onRoleDialogKeydown(event: KeyboardEvent): void { if (event.key === 'Escape') this.cancelRoleEdit(); }
  togglePermission(permissionId: number, checked: boolean): void { this.selectedPermissions.update((selected) => checked ? [...selected, permissionId] : selected.filter((id) => id !== permissionId)); }
  filteredPermissions(): Permission[] {
    const query = this.permissionSearch().trim().toLowerCase();
    return query ? this.permissions().filter((permission) => `${permission.display_name} ${permission.name}`.toLowerCase().includes(query)) : this.permissions();
  }
  setPermissionSearch(value: string): void { this.permissionSearch.set(value); }
  /** Role dialog -> POST/PUT /admin/roles -> roles + permission_role -> reloads roles and users. */
  saveRole(): void {
    const editing = this.editingRole(); const payload = { ...this.roleForm, permissions: this.selectedPermissions() };
    this.mutate(editing ? this.http.put(`${environment.apiUrl}/admin/roles/${editing.id}`, payload) : this.http.post(`${environment.apiUrl}/admin/roles`, payload), editing ? 'Role updated.' : 'Role created.', () => { this.cancelRoleEdit(); this.loadRoles(); this.loadUsers(); });
  }
  /** Delete role action -> backend removes role/pivot data under admin authorization, then reloads visible tables. */
  deleteRole(role: AdminRole): void {
    if (confirm(`Delete the role “${role.display_name}”?`)) this.mutate(this.http.delete(`${environment.apiUrl}/admin/roles/${role.id}`), 'Role deleted.', () => this.loadRoles());
  }
  roleNames(user: AdminUser): string { return user.roles.map((role) => role.display_name).join(', ') || 'No role'; }
  canEditUser(user: AdminUser): boolean { return this.isAdmin() || !user.roles.some((role) => role.name === 'admin'); }
  filteredUsers(): AdminUser[] {
    const query = this.userSearch().trim().toLowerCase();
    if (!query) return this.users();
    return this.users().filter((user) => [user.first_name, user.last_name, user.username ?? '', user.email, this.roleNames(user)].join(' ').toLowerCase().includes(query));
  }
  paginatedUsers(): AdminUser[] { return this.pageItems(this.filteredUsers(), this.userPage(), this.userPageSize()); }
  userLastPage(): number { return this.pageCount(this.filteredUsers().length, this.userPageSize()); }
  setUserSearch(value: string): void { this.userSearch.set(value); this.userPage.set(1); }
  setUserPageSize(value: string): void { this.userPageSize.set(this.pageSize(value)); this.userPage.set(1); }
  previousUserPage(): void { if (this.userPage() > 1) this.userPage.update((page) => page - 1); }
  nextUserPage(): void { if (this.userPage() < this.userLastPage()) this.userPage.update((page) => page + 1); }
  goToUserPage(page: number): void { this.userPage.set(Math.min(Math.max(1, page), this.userLastPage())); }
  clearUserSearch(): void { this.setUserSearch(''); }
  /** Exports currently filtered users (not a new SQL query) through ExcelExportService to a browser download. */
  exportUsers(): void {
    this.excelExport.export('users', 'Users', ['Name', 'Username', 'Email', 'Role', 'Status'], this.paginatedUsers().map((user) => [
      `${user.first_name} ${user.last_name}`, user.username ?? '', user.email, this.roleNames(user), user.is_active ? 'Active' : 'Disabled',
    ]));
  }
  filteredRoles(): AdminRole[] {
    const query = this.roleSearch().trim().toLowerCase();
    if (!query) return this.roles();
    return this.roles().filter((role) => `${role.name} ${role.display_name} ${role.permissions.map((permission) => permission.display_name).join(' ')}`.toLowerCase().includes(query));
  }
  paginatedRoles(): AdminRole[] { return this.pageItems(this.filteredRoles(), this.rolePage(), this.rolePageSize()); }
  roleLastPage(): number { return this.pageCount(this.filteredRoles().length, this.rolePageSize()); }
  setRoleSearch(value: string): void { this.roleSearch.set(value); this.rolePage.set(1); }
  setRolePageSize(value: string): void { this.rolePageSize.set(this.pageSize(value)); this.rolePage.set(1); }
  previousRolePage(): void { if (this.rolePage() > 1) this.rolePage.update((page) => page - 1); }
  nextRolePage(): void { if (this.rolePage() < this.roleLastPage()) this.rolePage.update((page) => page + 1); }
  goToRolePage(page: number): void { this.rolePage.set(Math.min(Math.max(1, page), this.roleLastPage())); }
  clearRoleSearch(): void { this.setRoleSearch(''); }
  /** Exports the currently filtered roles/permission summaries through ExcelExportService. */
  exportRoles(): void {
    this.excelExport.export('roles', 'Roles', ['Role', 'Identifier', 'Permissions', 'Access scope'], this.paginatedRoles().map((role) => [
      role.display_name, role.name, role.permissions.length, role.permissions.map((permission) => permission.display_name).join(', ') || 'No permissions assigned',
    ]));
  }
  filteredAdminPermissions(): Permission[] {
    const query = this.permissionTableSearch().trim().toLowerCase();
    return query ? this.permissions().filter((permission) => `${permission.display_name} ${permission.name}`.toLowerCase().includes(query)) : this.permissions();
  }
  paginatedAdminPermissions(): Permission[] { return this.pageItems(this.filteredAdminPermissions(), this.permissionPage(), this.permissionPageSize()); }
  permissionLastPage(): number { return this.pageCount(this.filteredAdminPermissions().length, this.permissionPageSize()); }
  setPermissionTableSearch(value: string): void { this.permissionTableSearch.set(value); this.permissionPage.set(1); }
  clearPermissionTableSearch(): void { this.setPermissionTableSearch(''); }
  setPermissionPageSize(value: string): void { this.permissionPageSize.set(this.pageSize(value)); this.permissionPage.set(1); }
  previousPermissionPage(): void { if (this.permissionPage() > 1) this.permissionPage.update((page) => page - 1); }
  nextPermissionPage(): void { if (this.permissionPage() < this.permissionLastPage()) this.permissionPage.update((page) => page + 1); }
  goToPermissionPage(page: number): void { this.permissionPage.set(Math.min(Math.max(1, page), this.permissionLastPage())); }
  /** Exports the currently filtered permissions already loaded with /admin/roles. */
  exportPermissions(): void {
    this.excelExport.export('permissions', 'Permissions', ['Permission', 'Identifier'], this.paginatedAdminPermissions().map((permission) => [permission.display_name, permission.name]));
  }
  openCreatePermission(): void { this.permissionForm = this.emptyPermissionForm(); this.permissionDialogOpen.set(true); }
  cancelPermissionCreate(): void { this.permissionDialogOpen.set(false); this.permissionForm = this.emptyPermissionForm(); }
  onPermissionDialogKeydown(event: KeyboardEvent): void { if (event.key === 'Escape') this.cancelPermissionCreate(); }
  /** Permission dialog -> POST /admin/permissions -> permissions table + audit_logs -> roles data reload. */
  savePermission(): void {
    this.mutate(this.http.post(`${environment.apiUrl}/admin/permissions`, this.permissionForm), 'Permission created.', () => { this.cancelPermissionCreate(); this.loadRoles(); });
  }
  filteredAuditLogs(): AuditLog[] {
    const query = this.auditSearch().trim().toLowerCase();
    if (!query) return this.auditLogs();
    return this.auditLogs().filter((log) => `${this.auditUserName(log)} ${log.user?.email ?? ''} ${log.event} ${log.ip_address ?? ''} ${this.auditMetadata(log)}`.toLowerCase().includes(query));
  }
  clearAuditSearch(): void { this.auditSearch.set(''); }
  filteredAuditEvents(): string[] {
    const query = this.auditEventQuery().trim().toLowerCase();
    return query ? this.auditEvents().filter((event) => event.toLowerCase().includes(query)) : this.auditEvents();
  }
  filteredAuditUsers(): AuditOptions['users'] {
    const query = this.auditUserQuery().trim().toLowerCase();
    return query ? this.auditUsers().filter((user) => this.auditUserLabel(user).toLowerCase().includes(query)) : this.auditUsers();
  }
  setAuditEventQuery(value: string): void {
    this.auditEventQuery.set(value);
    this.auditFilters.event = this.auditEvents().includes(value) ? value : '';
  }
  selectAuditEvent(event: string): void { this.auditFilters.event = event; this.auditEventQuery.set(event); }
  setAuditUserQuery(value: string): void {
    this.auditUserQuery.set(value);
    this.auditFilters.userId = '';
  }
  selectAuditUser(label: string): void {
    const user = this.auditUsers().find((candidate) => this.auditUserLabel(candidate) === label);
    this.auditFilters.userId = user ? String(user.id) : '';
    this.auditUserQuery.set(user ? this.auditUserLabel(user) : '');
  }
  auditUserLabel(user: AuditOptions['users'][number]): string { return `${user.first_name} ${user.last_name} — ${user.email}`; }
  /** Exports the current server-filtered audit_logs page after formatting it for Excel. */
  exportAuditLogs(): void {
    this.excelExport.export('audit-log', 'Audit log', ['When', 'Actor', 'Email', 'Event', 'IP address', 'Details'], this.filteredAuditLogs().map((log) => [
      log.created_at, this.auditUserName(log), log.user?.email ?? 'No linked account', log.event, log.ip_address ?? '', this.auditMetadata(log),
    ]));
  }
  applyAuditFilters(): void { this.loadAuditLogs(1); }
  clearAuditFilters(): void { this.auditFilters = { event: '', userId: '', from: '', to: '' }; this.auditEventQuery.set(''); this.auditUserQuery.set(''); this.loadAuditLogs(1); }
  previousAuditPage(): void { if (this.auditPage() > 1) this.loadAuditLogs(this.auditPage() - 1); }
  nextAuditPage(): void { if (this.auditPage() < this.auditLastPage()) this.loadAuditLogs(this.auditPage() + 1); }
  goToAuditPage(page: number): void { this.loadAuditLogs(Math.min(Math.max(1, page), this.auditLastPage())); }
  setAuditPageSize(value: string): void { this.auditPageSize.set(this.pageSize(value)); this.loadAuditLogs(1); }
  pageNumbers(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, Math.min(currentPage - 2, lastPage - 4));
    return Array.from({ length: Math.min(5, lastPage) }, (_, index) => start + index);
  }
  columnWidth(table: TableKey, column: number): number | null { return this.columnWidths()[table][column] ?? null; }
  startColumnResize(event: PointerEvent, table: TableKey, column: number): void {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    const header = handle.parentElement;
    if (!header) return;
    const startX = event.clientX;
    const startWidth = header.getBoundingClientRect().width;
    const documentRef = handle.ownerDocument;
    const onMove = (moveEvent: PointerEvent): void => {
      const width = Math.max(100, Math.round(startWidth + moveEvent.clientX - startX));
      this.columnWidths.update((all) => {
        const widths = [...all[table]];
        widths[column] = width;
        return { ...all, [table]: widths };
      });
    };
    const onUp = (): void => { documentRef.removeEventListener('pointermove', onMove); documentRef.removeEventListener('pointerup', onUp); };
    documentRef.addEventListener('pointermove', onMove);
    documentRef.addEventListener('pointerup', onUp, { once: true });
  }
  auditUserName(log: AuditLog): string { return log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System / deleted user'; }
  auditMetadata(log: AuditLog): string {
    if (!log.metadata || Object.keys(log.metadata).length === 0) return '—';
    return Object.entries(log.metadata).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ');
  }

  /** GET /admin/users -> UserController joins users/roles/permissions -> users signal for local search and pagination. */
  private loadUsers(): void {
    this.loading.set(true);
    this.http.get<{ data: AdminUser[] }>(`${environment.apiUrl}/admin/users`).subscribe({ next: (response) => { this.users.set(response.data); this.userPage.update((page) => Math.min(page, this.pageCount(response.data.length, this.userPageSize()))); }, error: (error: HttpErrorResponse) => this.showError(error, 'Unable to load users.'), complete: () => this.loading.set(false) });
  }
  /** GET /admin/roles -> roles + permission_role + permissions -> roles and permissions signals. */
  private loadRoles(): void {
    this.http.get<{ roles: AdminRole[]; permissions: Permission[] }>(`${environment.apiUrl}/admin/roles`).subscribe({ next: (response) => { this.roles.set(response.roles); this.rolePage.update((page) => Math.min(page, this.pageCount(response.roles.length, this.rolePageSize()))); this.permissions.set(response.permissions); this.permissionPage.update((page) => Math.min(page, this.pageCount(response.permissions.length, this.permissionPageSize()))); }, error: (error: HttpErrorResponse) => this.showError(error, 'Unable to load roles.') });
  }
  /** GET /admin/audit-logs/options -> audit_logs/users -> autocomplete lists for filter controls. */
  private loadAuditOptions(): void {
    this.http.get<AuditOptions>(`${environment.apiUrl}/admin/audit-logs/options`).subscribe({
      next: (response) => { this.auditEvents.set(response.events); this.auditUsers.set(response.users); },
      error: (error: HttpErrorResponse) => this.showError(error, 'Unable to load audit filters.'),
    });
  }
  /** GET /admin/audit-logs with selected filters -> paginated audit_logs + user relation -> audit table signals. */
  private loadAuditLogs(page = this.auditPage()): void {
    this.loading.set(true);
    let params = new HttpParams().set('page', page).set('per_page', this.auditPageSize());
    if (this.auditFilters.event) params = params.set('event', this.auditFilters.event);
    if (this.auditFilters.userId) params = params.set('user_id', this.auditFilters.userId);
    if (this.auditFilters.from) params = params.set('from', this.auditFilters.from);
    if (this.auditFilters.to) params = params.set('to', this.auditFilters.to);
    this.http.get<AuditLogResponse>(`${environment.apiUrl}/admin/audit-logs`, { params }).subscribe({
      next: (response) => { this.auditLogs.set(response.data); this.auditPage.set(response.current_page); this.auditLastPage.set(response.last_page); this.auditTotal.set(response.total); },
      error: (error: HttpErrorResponse) => this.showError(error, 'Unable to load audit logs.'),
      complete: () => this.loading.set(false),
    });
  }
  /** Shared mutation subscriber: sends the prepared HTTP request, publishes UI feedback, then invokes its table reload callback. */
  private mutate(request: Observable<unknown>, success: string, done: () => void): void {
    this.loading.set(true); this.message.set(null); this.error.set(null);
    this.auth.initializeCsrf().pipe(switchMap(() => request)).subscribe({ next: () => { this.message.set(success); done(); }, error: (error: HttpErrorResponse) => this.showError(error, 'The change could not be saved.'), complete: () => this.loading.set(false) });
  }
  private showError(error: HttpErrorResponse, fallback: string): void { this.error.set(error.error?.message ?? fallback); }
  private pageCount(total: number, pageSize: number): number { return Math.max(1, Math.ceil(total / pageSize)); }
  private pageItems<T>(items: T[], page: number, pageSize: number): T[] {
    const safePage = Math.min(page, this.pageCount(items.length, pageSize));
    return items.slice((safePage - 1) * pageSize, safePage * pageSize);
  }
  private pageSize(value: string): number { return [5, 10, 25, 50].includes(Number(value)) ? Number(value) : 10; }
  private emptyUserForm() { return { first_name: '', last_name: '', username: '', email: '', password: '', role: 'user', is_active: true }; }
  private emptyRoleForm() { return { name: '', display_name: '' }; }
  private emptyPermissionForm() { return { name: '', display_name: '' }; }
}
