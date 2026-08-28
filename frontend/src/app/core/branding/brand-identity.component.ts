import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrandingService } from './branding.service';

@Component({
  selector: 'app-brand-identity', standalone: true,
  template: `@if (branding.config().logo_url) { <img class="brand-logo" [src]="branding.config().logo_url" [alt]="branding.config().name + ' logo'" /> } @else { <span class="brand-mark">{{ branding.config().short_name }}</span> } <span class="brand-name">{{ branding.config().name }}</span>`,
  styles: [`:host{display:inline-flex;align-items:center;gap:10px}.brand-mark{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:10px;color:#fff;background:var(--brand-primary);font-weight:900}.brand-logo{width:32px;height:32px;object-fit:contain;border-radius:10px}.brand-name{font:800 1.05rem Inter,system-ui,sans-serif}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandIdentityComponent {
  readonly branding = inject(BrandingService);
}
