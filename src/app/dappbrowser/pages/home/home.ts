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
import { GlobalThemeService } from 'src/app/services/global.theme.service';

type DAppMenuEntry = {
  icon: string;
  title: string;
  description: string;
  url: string;
}

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['home.scss']
})
export class HomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public dApps: DAppMenuEntry[] = [
    {
      icon: '/assets/browser/dapps/profile.png',
      title: 'Profile',
      description: 'A better way to be online using Elastos DID',
      url: 'https://profile.site/'
    },
    {
      icon: '/assets/browser/dapps/tokswap.png',
      title: 'TokSwap',
      description: 'Swap your tokens on the Elastos blockchain',
      url: 'https://tokswap.net/'
    },
    {
      icon: '/assets/browser/dapps/tokbridge.svg',
      title: 'Shadow Tokens',
      description: 'Bridge assets between Elastos and other chains',
      url: 'https://tokbridge.net/'
    },
    {
      icon: '/assets/browser/dapps/creda.png',
      title: 'CreDa',
      description: 'Turn data into wealth - Elastos DID powered DeFi dApp',
      url: 'https://beta.creda.app/'
    }
  ];

  constructor(
    public translate: TranslateService,
    private nav: GlobalNavService,
    private iab: InAppBrowser,
    public theme: GlobalThemeService,
    private httpClient: HttpClient
  ) {
  }

  ionViewWillEnter() {
  }

  public onDAppClicked(app: DAppMenuEntry) {
    DAppBrowser.open(app.url, this.iab, this.httpClient);
  }

  public onUrlInput(url: string) {
    if (url && url !== "") {
      let fixedUrl: string = url.toLowerCase();
      if (!fixedUrl.startsWith("http"))
        fixedUrl = "https://"+fixedUrl;

      DAppBrowser.open(fixedUrl, this.iab, this.httpClient);
    }
  }

  /* public browserMdexTest() {
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
  } */
}
