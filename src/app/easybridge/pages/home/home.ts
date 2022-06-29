import { Component, NgZone, ViewChild } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { BridgeableToken, equalTokens } from '../../model/bridgeabletoken';
import { DestinationToken } from '../../model/destinationtoken';
import { SourceToken } from '../../model/sourcetoken';
import { Transfer, TransferStep } from '../../model/transfer';
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
  public initializing = true;
  public showingIntro = true;
  public fetchingTokens = false;
  public canEditFields = true;
  public transferStarted = false; // Whether the transfer setup can be changed by the user (source token, amount etc). This gets disabled after the transfer button is clicked

  public sourceTokens: SourceToken[] = [];
  public selectedSourceToken: SourceToken = null;
  public destinationTokens: DestinationToken[] = [];
  public selectedDestinationToken: DestinationToken = null;
  public transferAmount: number = null;
  private mainCoinSubWallet: AnyMainCoinEVMSubWallet = null;

  public activeTransfer: Transfer = null;
  public transferIsBeingComputed = false;
  public activeTransferCanContinue = false; // According to active transfer status, whether the transfer button should be enabeld or not
  public activeTransferCanDismiss = false; // According to active transfer status, whether the dismiss button should be enabeld or not

  private transferStatusSub: Subscription;

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

    // Load the on going transfer from disk if there is one.
    this.activeTransfer = await Transfer.loadExistingTransfer();

    // No on going transfer? Prepare for a new one
    if (!this.activeTransfer) {
      await this.prepareForNewTransfer();
    }
    else {
      // Existing transfer? Don't show the intro, directly show the status
      this.showingIntro = false;
      this.canEditFields = false;

      this.subscribeToTransferStatus();

      // Update UI with saved data
      this.transferAmount = this.activeTransfer.amount;
      let sourceNetwork = <EVMNetwork>this.networkService.getNetworkByChainId(this.activeTransfer.sourceToken.chainId);
      await this.loadSubWallet(this.activeTransfer.masterWalletId, sourceNetwork);
      this.fetchSourceTokensBalances();
      this.selectedDestinationToken = {
        token: this.activeTransfer.destinationToken,
        estimatedAmount: new BigNumber(0)
      };
    }

    this.initializing = false;
  }

  private async prepareForNewTransfer() {
    await this.loadSubWallet(this.walletService.activeMasterWalletId, <EVMNetwork>this.walletService.activeNetworkWallet.value.network);
    this.fetchSourceTokensBalances();
  }

  private async loadSubWallet(masterWalletId: string, network: EVMNetwork): Promise<void> {
    if (!(network instanceof EVMNetwork)) {
      // TODO
    }
    else {
      // Get the active master wallet ID (the currently selected one in essentials)
      console.log("Source master wallet ID:", masterWalletId);
      let sourceMasterWallet = this.walletService.getMasterWallet(masterWalletId);

      // Get a network wallet for the target source chain - don't launch its background services
      let sourceNetworkWallet = await network.createNetworkWallet(sourceMasterWallet, false);
      console.log("Source network wallet:", sourceNetworkWallet);

      this.mainCoinSubWallet = await sourceNetworkWallet.getMainEvmSubWallet();
    }
  }

  private fetchSourceTokensBalances() {
    // Start fetching balances and populate the UI list are they arrive.
    this.fetchingTokens = true;
    this.easyBridgeService.fetchBridgeableBalances(this.mainCoinSubWallet).subscribe({
      next: usableTokens => {
        this.sourceTokens = usableTokens;

        // If there is an active transfer, auto re-select the source token when the balance gets fetched
        if (this.activeTransfer) {
          this.selectedSourceToken = this.sourceTokens.find(t => equalTokens(t.token, this.activeTransfer.sourceToken));
          if (this.selectedSourceToken) {
            this.updateDestinationTokens();
            this.selectedDestinationToken = this.destinationTokens.find(t => equalTokens(t.token, this.activeTransfer.destinationToken));
          }
        }
      },
      complete: () => {
        this.fetchingTokens = false;
      }
    });
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
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
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
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
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
      this.unsubscribeFromTransferStatus();
      this.activeTransfer = null;
      this.transferIsBeingComputed = true;
    });

    let transfer = await Transfer.prepareNewTransfer(this.mainCoinSubWallet.networkWallet.id, this.selectedSourceToken.token, this.selectedDestinationToken.token, this.transferAmount);

    Logger.log("easybridge", "Transfer computation result:", transfer);

    this.zone.run(() => {
      this.activeTransfer = transfer;
      this.subscribeToTransferStatus();

      this.transferIsBeingComputed = false;
    });
  }

  private subscribeToTransferStatus() {
    this.transferStatusSub = this.activeTransfer.status.subscribe(status => {
      Logger.log("easybridge", "Transfer status:", status);
      this.activeTransferCanContinue = status.canContinue;
      this.activeTransferCanDismiss = status.canDismiss;
    })
  }

  private unsubscribeFromTransferStatus() {
    if (this.transferStatusSub) {
      this.transferStatusSub.unsubscribe();
      this.transferStatusSub = null;
    }
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
    return this.activeTransferCanContinue && this.activeTransfer && !!this.selectedDestinationToken && !!this.selectedSourceToken && !!this.transferAmount && !this.transferStarted;
    // TODO: && transferAmount > min tx amount
  }

  public canReset(): boolean {
    return this.activeTransferCanDismiss || (this.activeTransfer && this.activeTransfer.currentStep == TransferStep.NEW);
  }

  /**
   * Starts or continues the transfer process where it was interrupted.
   */
  public async transfer() {
    this.transferStarted = true;
    this.canEditFields = false;

    await this.activeTransfer.execute();

    this.transferStarted = false;

    // TODO: update status live, reset data after transfer, show result, etc
  }

  /**
   * Deletes current transfer state to restart from scratch.
   */
  public async reset() {
    this.unsubscribeFromTransferStatus();

    if (this.activeTransfer) {  // Normally, should always be set, just in case.
      await this.activeTransfer.reset();
      this.activeTransfer = null;
    }

    this.selectedSourceToken = null;
    this.selectedDestinationToken = null;
    this.transferAmount = null;
    this.transferStarted = false;

    void this.prepareForNewTransfer();
  }

  public getTransferProgressIndex(): number {
    if (!this.activeTransfer)
      return 0;

    return this.activeTransfer.getTransferProgressIndex();
  }

  public getTotalNumberOfSteps(): number {
    if (!this.activeTransfer)
      return 0;

    return this.activeTransfer.getTotalNumberOfSteps();
  }

  public getTransferProgressMessage(): string {
    if (!this.activeTransfer)
      return "Not started";

    return this.activeTransfer.getTransferProgressMessage();
  }
}
