import { Component, OnInit } from '@angular/core';

declare let appManager: AppManagerPlugin.AppManager;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    /* TODO @chad titleBarManager.setTitle('Home');
    titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.HOME);*/
  }

  ionViewDidEnter() {
  }
}
