import { Component, NgZone, ViewChild } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AnyEVMNetworkWallet } from 'src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { BridgeableToken } from '../../model/bridgeabletoken';
import { DestinationToken } from '../../model/destinationtoken';
import { SourceToken } from '../../model/sourcetoken';
import { Transfer } from '../../model/transfer';
import { EasyBridgeService } from '../../services/easybridge.service';
import { UniswapService } from '../../services/uniswap.service';

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
  public showingIntro = true;
  public fetchingTokens = false;
  public sourceTokens: SourceToken[] = [];
  public selectedSourceToken: SourceToken = null;
  public destinationTokens: DestinationToken[] = [];
  public selectedDestinationToken: DestinationToken = null;
  public transferAmount: number = null;
  public walletAddress: string = null;

  public activeTransfer: Transfer = null;
  public transferIsBeingComputed = false;
  public transferStarted = false;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private walletService: WalletService,
    private splashScreen: SplashScreen,
    private networkService: WalletNetworkService,
    private easyBridgeService: EasyBridgeService,
    private uniswapService: UniswapService, // Init
    public globalNativeService: GlobalNativeService,
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('easybridge.home-title'));
  }

  ionViewDidEnter() {
    void this.init();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private async init(): Promise<void> {
    Logger.log("easybridge", "Home page - initializing context");

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
      this.walletAddress = await activeNetworkWallet.getMainEvmSubWallet().getTokenAddress(AddressUsage.EVM_CALL);

      // Start fetching balances and populate the UI list are they arrive.
      this.fetchingTokens = true;
      this.easyBridgeService.fetchBridgeableBalances(this.walletAddress).subscribe({
        next: usableTokens => {
          this.sourceTokens = usableTokens;
        },
        complete: () => {
          this.fetchingTokens = false;
        }
      });
    }
  }

  public getDisplayableAmount(readableBalance: BigNumber): string {
    return readableBalance.toPrecision(5);
  }

  public getTokenLogo(token: BridgeableToken): string {
    return this.networkService.getNetworkByChainId(token.chainId).logo;
  }

  public hasBridgeFees(): boolean {
    return this.activeTransfer.bridgeStep.bridgeFees > 0;
  }

  public getDisplayableBridgeFees(): string {
    return this.activeTransfer.bridgeStep.bridgeFees.toPrecision(2);
  }

  public getDisplayableBridgeFeesAmount(): string {
    return this.activeTransfer.bridgeStep.bridgeFeesAmount.toPrecision(5);
  }

  public getDisplayableSwapFees(): string {
    return this.activeTransfer.swapStep.swapFees.toPrecision(2);
  }

  public getDisplayableSwapPriceImpact(): string {
    return this.activeTransfer.swapStep.trade.priceImpact.toFixed(2);
  }

  public selectSourceToken(sourceToken: SourceToken) {
    if (this.transferIsBeingComputed || this.transferStarted) // Transfer is being computed or executed - don't allow to change things
      return;

    // Unselect, if it was selected
    if (this.selectedSourceToken) {
      this.selectedSourceToken = null;
      return;
    }

    this.selectedSourceToken = sourceToken;
    this.updateDestinationTokens();

    this.transferAmount = null;
  }

  public async selectDestinationToken(destinationToken: DestinationToken) {
    if (this.transferIsBeingComputed || this.transferStarted) // Transfer is being computed or executed - don't allow to change things
      return;

    // Unselect, if it was selected
    if (this.selectedDestinationToken) {
      this.selectedDestinationToken = null;
      return;
    }

    this.selectedDestinationToken = destinationToken;
    this.transferAmount = null;

    await this.recomputeTransfer();
  }

  /**
   * Rebuilds the list of possible destination tokens based on the selected source token.
   */
  private updateDestinationTokens() {
    // Support for ESC only for now
    this.destinationTokens = this.easyBridgeService.getUsableDestinationTokens(this.selectedSourceToken, 20);
  }

  private async recomputeTransfer() {
    if (!(this.transferAmount > 0))
      return;

    Logger.log("easybridge", "Recomputing transfer info", this.transferAmount);

    this.zone.run(() => {
      this.activeTransfer = null;
      this.transferIsBeingComputed = true;
    });

    let transfer = new Transfer();
    await transfer.compute(this.walletAddress, this.selectedSourceToken.token, this.selectedDestinationToken.token, this.transferAmount);

    Logger.log("easybridge", "Transfer computation result:", transfer);

    this.zone.run(() => {
      this.activeTransfer = transfer;
      this.transferIsBeingComputed = false;
    });
  }

  /**
   * Transfer amount changed by user on UI
   */
  public transferAmountChanged() {
    if (this.transferIsBeingComputed || this.transferStarted) // Transfer is being computed or executed - don't allow to change things
      return;

    void this.recomputeTransfer();
  }

  public canTransfer(): boolean {
    return !!this.selectedDestinationToken && !!this.selectedSourceToken && !!this.transferAmount && !!this.activeTransfer;
    // TODO: && transferAmount > min tx amount
  }

  /**
   * Starts or continues the transfer process where it was interrupted.
   */
  public async transfer() {
    this.transferStarted = true;

    let activeNetworkWallet = <AnyEVMNetworkWallet>this.walletService.activeNetworkWallet.value;
    this.walletAddress = await activeNetworkWallet.getMainEvmSubWallet().getTokenAddress(AddressUsage.EVM_CALL);

    await this.activeTransfer.execute(activeNetworkWallet.getMainEvmSubWallet(), updatedTransfer => {
      console.log("transf updated", updatedTransfer);
    });

    // TODO: update status live, reset data after transfer, show result, etc
  }
}
