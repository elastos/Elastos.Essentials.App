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
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-connect',
  templateUrl: './connect.page.html',
  styleUrls: ['./connect.page.scss'],
})
export class WalletConnectConnectPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public sessionRequest: {
    connectorKey: string,
    request: SessionRequestParams
  };
  public ethAccounts: string[] = [];

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public developer: DeveloperService,
    public translate: TranslateService,
    private route: ActivatedRoute,
    private walletConnect: GlobalWalletConnectService,
    private walletManager: WalletManager,
    private nav: GlobalNavService,
    private native: GlobalNativeService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      this.sessionRequest = params as any;

      this.ethAccounts = [];
      let wallets = this.walletManager.getWalletsList();
      for (let wallet of wallets) {
        let subwallet = wallet.getSubWallet(StandardCoinName.ETHSC) as ETHChainSubWallet; // TODO: ONLY ELASTOS ETH FOR NOW
        this.ethAccounts.push(await subwallet.createAddress());
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-request'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.titleBar.globalNav.exitCurrentContext();
    });
  }

  ionViewWillLeave() {
  }

  async openSession() {
    await this.walletConnect.acceptSessionRequest(this.sessionRequest.connectorKey, this.ethAccounts);
    this.nav.exitCurrentContext();

    // Because for now we don't close Essentials after handling wallet connect requests, we simply
    // inform users to manually "alt tab" to return to the app they are coming from.
    this.native.genericToast("Operation completed, please return to the original app.", 4000);
  }
}
