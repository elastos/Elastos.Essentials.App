import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
  selector: 'app-developer',
  templateUrl: './developer.page.html',
  styleUrls: ['./developer.page.scss'],
})
export class DeveloperPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public privatenet: string = '';

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('developer-options'));
  }

  ionViewWillLeave() {
  }

  getBackgroundServicesTitle() {
    if(!this.developer.backgroundServicesEnabled) {
      return this.translate.instant('background-services-disabled');
    } else {
      return this.translate.instant('background-services-enabled');
    }
  }
}
