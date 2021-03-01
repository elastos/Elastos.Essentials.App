import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { ThemeService } from '../../services/theme.service';

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
    public theme: ThemeService,
    public developer: DeveloperService,
    public translate: TranslateService
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('developer-options'));
    this.settings.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
    this.settings.setTitleBarBackKeyShown(false);
  }

  getBackgroundServicesTitle() {
    if(!this.developer.backgroundServicesEnabled) {
      return this.translate.instant('background-services-disabled');
    } else {
      return this.translate.instant('background-services-enabled');
    }
  }
}
