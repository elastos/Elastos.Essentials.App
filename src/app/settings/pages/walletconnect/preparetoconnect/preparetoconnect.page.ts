import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { DeveloperService } from '../../../services/developer.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../../services/settings.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { ActivatedRoute } from '@angular/router';
import { Logger } from 'src/app/logger';
import { SessionRequestParams } from 'src/app/model/walletconnect/types';
import { GlobalWalletConnectService } from 'src/app/services/global.walletconnect.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { Coin, StandardCoinName } from 'src/app/wallet/model/Coin';
import { ETHChainSubWallet } from 'src/app/wallet/model/wallets/ETHChainSubWallet';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-preparetoconnect',
  templateUrl: './preparetoconnect.page.html',
  styleUrls: ['./preparetoconnect.page.scss'],
})
export class WalletConnectPrepareToConnectPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public suggestToResetSession = false;

  constructor(
    private zone: NgZone,
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private walletConnect: GlobalWalletConnectService,
    private walletManager: WalletManager,
    private nav: GlobalNavService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.titleBar.setTitle(this.translate.instant('wallet-connect-prepare-to-connect'));

    // Suggest user to delete a potential wallet connect session after a while in case he doesn't
    // receive any "session_request" event.
    this.suggestToResetSession = false;
    setTimeout(() => {
      this.zone.run(()=>{
        this.suggestToResetSession = true;
      });
    }, 5000);
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
  }

  viewSessions() {
    this.nav.navigateTo("walletconnectsession", "/settings/walletconnect/sessions");
  }
}
