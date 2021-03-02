import { Component, ViewChild } from '@angular/core';

import { Native } from '../../services/native';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from '../../services/ux.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'page-notsignedin',
  templateUrl: 'notsignedin.html',
  styleUrls: ['notsignedin.scss']
})
export class NotSignedInPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(private native: Native, private translate: TranslateService, private uxService: UXService) {
  }

  ionViewWillEnter() {
    this.uxService.makeAppVisible();
    this.titleBar.setTitle("Error");
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
  }
}
