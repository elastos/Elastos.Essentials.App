import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';
import { ThemeService } from 'src/app/settings/services/theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
  selector: 'app-select-net',
  templateUrl: './select-net.page.html',
  styleUrls: ['./select-net.page.scss'],
})
export class SelectNetPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public translate: TranslateService,
    public developer: DeveloperService,
    public theme: ThemeService,
    private settings: SettingsService
  ) { }

  ngOnInit() {
  }


  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('choose-network'));
    this.settings.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
    this.settings.setTitleBarBackKeyShown(false);
  }

}
