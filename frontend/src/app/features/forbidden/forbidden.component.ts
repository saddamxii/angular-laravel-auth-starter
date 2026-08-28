import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent { readonly i18n = inject(TranslationService); }
