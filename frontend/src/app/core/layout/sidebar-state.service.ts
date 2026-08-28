import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  readonly collapsed = signal(localStorage.getItem('sidebar_collapsed') === 'true');

  toggle(): void { this.setCollapsed(!this.collapsed()); }
  setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    localStorage.setItem('sidebar_collapsed', String(value));
  }
}
