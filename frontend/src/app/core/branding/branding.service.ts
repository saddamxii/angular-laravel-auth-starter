import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ThemeStateService } from '../layout/theme-state.service';

export interface Branding {
  name: string;
  short_name: string;
  logo_url: string | null;
  theme: 'light' | 'dark';
  primary_color: string;
  accent_color: string;
}

const defaultBranding: Branding = {
  name: 'Auth Starter', short_name: 'A', logo_url: null, theme: 'light', primary_color: '#2363a4', accent_color: '#138460',
};

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly themeState = inject(ThemeStateService);
  readonly config = signal<Branding>(defaultBranding);

  async load(): Promise<void> {
    const branding = await firstValueFrom(this.http.get<Branding>('/api/branding').pipe(catchError(() => of(defaultBranding))));
    this.config.set(branding);
    this.document.title = branding.name;
    this.themeState.applyBrandDefault(branding.theme);
    this.document.documentElement.style.setProperty('--brand-primary', branding.primary_color);
    this.document.documentElement.style.setProperty('--brand-accent', branding.accent_color);
  }
}
