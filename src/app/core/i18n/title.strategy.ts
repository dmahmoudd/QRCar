import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private snapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      this.i18n.locale();
      if (this.snapshot) {
        this.updateTitle(this.snapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.snapshot = snapshot;
    const key = this.buildTitle(snapshot);
    this.title.setTitle(key ? this.i18n.t(key) : this.i18n.t('brand.title'));
  }
}
