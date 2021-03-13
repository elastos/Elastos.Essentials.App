import { Component, ViewChild } from '@angular/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'page-notsignedin',
  templateUrl: 'notsignedin.html',
  styleUrls: ['notsignedin.scss']
})
export class NotSignedInPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Error");
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
  }
}
