import { Component, ViewChild } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { init } from '@sentry/browser';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AnyEVMNetworkWallet } from 'src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { UsableToken } from '../../model/usabletoken';
import { EasyBridgeService } from '../../services/easybridge.service';

/**
 * Migrator main page
 */
@Component({
  selector: 'page-easybridge-home',
  templateUrl: 'home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  // UI model
  public usableTokens: UsableToken[] = [];

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private translate: TranslateService,
    private walletService: WalletService,
    private splashScreen: SplashScreen,
    private networkService: GlobalNetworksService,
    private easyBridgeService: EasyBridgeService,
    public globalNativeService: GlobalNativeService,
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('easybridge.home-title'));
  }

  ionViewDidEnter() {
    void init();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private async init(): Promise<void> {
    let sourceNetwork = this.walletService.activeNetworkWallet.value.network;
    if (!(sourceNetwork instanceof EVMNetwork)) {
      // TODO
    }
    else {
      // Get the active master wallet ID (the currently selected one in essentials)
      let sourceMasterWalletId = this.walletService.activeMasterWalletId;
      console.log("Source master wallet ID:", sourceMasterWalletId);
      let sourceMasterWallet = this.walletService.getMasterWallet(sourceMasterWalletId);

      // Get a network wallet for the target source chain - don't launch its background services
      let sourceNetworkWallet = await sourceNetwork.createNetworkWallet(sourceMasterWallet, false);
      console.log("Source network wallet:", sourceNetworkWallet);

      let activeNetworkWallet = <AnyEVMNetworkWallet>this.walletService.activeNetworkWallet.value;
      let walletAddress = await activeNetworkWallet.getMainEvmSubWallet().getTokenAddress(AddressUsage.EVM_CALL);

      void this.easyBridgeService.fetchBridgeableBalances(walletAddress).then(usableTokens => {
        this.usableTokens = usableTokens;
      });
    }
  }

  public testBridge() {
    void this.easyBridgeService.bridgeTokensTest();
  }
}
