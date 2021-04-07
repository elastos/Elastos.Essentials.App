import { Component, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

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
    public theme: GlobalThemeService,
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('choose-network'));
  }

  ionViewWillLeave() {
  }

}
