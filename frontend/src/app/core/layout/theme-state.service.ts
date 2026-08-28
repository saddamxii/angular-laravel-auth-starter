import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStateService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<AppTheme>(this.readTheme());

  constructor() { this.applyTheme(this.theme()); }

  toggle(): void { this.setTheme(this.theme() === 'light' ? 'dark' : 'light'); }
  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    localStorage.setItem('app_theme', theme);
    this.applyTheme(theme);
  }
  applyBrandDefault(theme: AppTheme): void {
    if (localStorage.getItem('app_theme') === null) {
      this.theme.set(theme);
      this.applyTheme(theme);
    }
  }
  private readTheme(): AppTheme {
    const stored = localStorage.getItem('app_theme');
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  }
  private applyTheme(theme: AppTheme): void { this.document.documentElement.dataset['theme'] = theme; }
}
