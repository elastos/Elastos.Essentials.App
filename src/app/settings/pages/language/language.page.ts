import { Component, OnInit, ViewChild } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { ThemeService } from 'src/app/didsessions/services/theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
  selector: 'app-language',
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public settings: SettingsService,
    public languageService: LanguageService,
    public theme: ThemeService,
    public translate: TranslateService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('language-setting'));
    this.settings.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
    this.settings.setTitleBarBackKeyShown(false);
  }
}
