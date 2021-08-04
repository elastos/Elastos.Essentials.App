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
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

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
  private backSubscription: Subscription = null;

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
    private platform: Platform,
    private native: GlobalNativeService
  ) { }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.route.queryParams.subscribe(async params => {
      this.sessionRequest = params as any;

      // Use only the active master wallet.
      this.ethAccounts = [];
      let activeWallet = this.walletManager.getMasterWallet(this.walletManager.activeMasterWallet.value);
      let subwallet = activeWallet.getSubWallet(StandardCoinName.ETHSC) as ETHChainSubWallet; // TODO: ONLY ELASTOS ETH FOR NOW
      this.ethAccounts.push(await subwallet.createAddress());
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.wallet-connect-request'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
      // Close
      await this.walletConnect.rejectSession(this.sessionRequest.connectorKey, "Scanning again");
      void this.titleBar.globalNav.exitCurrentContext();
    });

    // Catch android back key to reject the session
    this.backSubscription = this.platform.backButton.subscribeWithPriority(0, async (processNext) => {
      await this.walletConnect.rejectSession(this.sessionRequest.connectorKey, "Scanning again");
      processNext();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    this.backSubscription.unsubscribe();
  }

  async openSession() {
    await this.walletConnect.acceptSessionRequest(this.sessionRequest.connectorKey, this.ethAccounts);
    await this.nav.exitCurrentContext();

    // Because for now we don't close Essentials after handling wallet connect requests, we simply
    // inform users to manually "alt tab" to return to the app they are coming from.
    this.native.genericToast("settings.wallet-connect-popup", 2000);
  }
}
