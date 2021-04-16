import { Component } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'home.html',
  styleUrls: ['./home.scss']
})
export class ProposalListsHomePage {
  
  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService
  ) {
  }

  ionViewWillEnter() {
  }
}
