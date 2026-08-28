import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService, type AppLocale } from './translation.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-language-selector', standalone: true, imports: [FormsModule],
  template: `<label class="language-selector"><span class="sr-only">Language</span><select [ngModel]="i18n.locale()" (ngModelChange)="changeLocale($event)"><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label>`,
  styles: [`.language-selector{display:block}.language-selector select{height:40px;border:1px solid #e1e7ef;border-radius:10px;padding:0 28px 0 10px;color:#435c78;background:#fff;font:700 .78rem system-ui;cursor:pointer}.language-selector select:hover,.language-selector select:focus{border-color:#bfd2e6;outline:0;background:#f8fbfe}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
  readonly i18n = inject(TranslationService);
  private readonly auth = inject(AuthService);
  changeLocale(locale: string): void {
    if (!['en', 'fr', 'es'].includes(locale)) return;
    const validLocale = locale as AppLocale;
    this.i18n.setLocale(validLocale);
    if (this.auth.isAuthenticated()) this.auth.updateLocale(validLocale).subscribe();
  }
}
