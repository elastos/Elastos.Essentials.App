import { Component } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UXService } from '../../../services/ux.service';

@Component({
  templateUrl: 'home.html',
  styleUrls: ['./home.scss']
})
export class ProposalListsHomePage {
  
  constructor(
    private uxService: UXService,
    public theme: GlobalThemeService
  ) {
  }

  ionViewWillEnter() {
    this.uxService.setTitleBarBackKeyShown(false);
  }
}
