import { Component, ViewChild } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'home.html',
  styleUrls: ['./home.scss']
})
export class ProposalListsHomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  
  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('proposals'));
    this.titleBar.setNavigationMode(null);
  }
}
