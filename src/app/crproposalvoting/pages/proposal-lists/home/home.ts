import { Component, ViewChild } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
  templateUrl: 'home.html',
  styleUrls: ['./home.scss']
})
export class ProposalListsHomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  
  constructor(
    public theme: GlobalThemeService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Proposals");
  }
}
