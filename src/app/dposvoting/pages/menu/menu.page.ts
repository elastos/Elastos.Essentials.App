import { Component, OnInit, ViewChild } from '@angular/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor() { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle('DPoS Voting');
    this.titleBar.setTheme('#A25BFE', TitleBarForegroundMode.LIGHT)
    this.titleBar.setNavigationMode(null);
  }

}
