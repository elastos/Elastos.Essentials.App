import { Component, ViewChild } from '@angular/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { TranslateService } from '@ngx-translate/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { DAppBrowser } from 'src/app/model/dappbrowser/dappbrowser';
import { HttpClient } from '@angular/common/http';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['home.scss']
})
export class HomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(
    public translate: TranslateService,
    private nav: GlobalNavService,
    private iab: InAppBrowser,
    private httpClient: HttpClient
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle('Discover');
    this.titleBar.setBackgroundColor("#181d20");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
  }


  public browserMdexTest() {
    let browser = DAppBrowser.open("https://mdex.me", this.iab, this.httpClient);
  }

  public browserFildaTest() {
    let browser = DAppBrowser.open("https://filda.io", this.iab, this.httpClient);
  }

  public browserCredaTest() {
    let browser = DAppBrowser.open("https://beta.creda.app", this.iab, this.httpClient);
  }

  public browserElavateTest() {
    //let browser = DAppBrowser.open("https://elavate.exchange/", this.iab, this.httpClient);
    let browser = DAppBrowser.open("http://192.168.31.114:3000/", this.iab, this.httpClient);
  }

  public browserPilotTest() {
    let browser = DAppBrowser.open("https://p.td/", this.iab, this.httpClient);
  }

  public browserTokswapTest() {
    let browser = DAppBrowser.open("https://tokswap.net/", this.iab, this.httpClient);
  }

  public browserTokbridgeTest() {
    let browser = DAppBrowser.open("https://tokbridge.net/", this.iab, this.httpClient);
  }

  public browserOtherTest() {
    let browser = DAppBrowser.open("http://192.168.31.114:8101", this.iab, this.httpClient);
    //let browser = DAppBrowser.open("https://o3swap.com/vault", this.iab, this.httpClient);
  }
}
