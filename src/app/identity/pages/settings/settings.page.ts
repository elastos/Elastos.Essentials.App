import { Component, OnInit, ViewChild } from '@angular/core';
import { UXService } from '../../services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    public UX: UXService,
    public theme: GlobalThemeService,
    public translate: TranslateService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings'));
    this.UX.setTitleBarBackKeyShown(true);
    this.UX.setTitleBarSettingsKeyShown(false);
  }

}
