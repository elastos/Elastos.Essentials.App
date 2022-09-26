import { Component, NgZone, ViewChild } from '@angular/core';
import { IonInput, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { Logger } from 'src/app/logger';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
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
  public lastError: string = null;

  public sourceTokens: SourceToken[] = [];
  public selectedSourceToken: SourceToken = null;
  public destinationTokens: DestinationToken[] = [];
  public selectedDestinationToken: DestinationToken = null;
  public transferAmount: number = null;

  private masterWallet: MasterWallet = null;
  private evmWalletAddress: string = null;
  //private mainCoinSubWallet: AnyMainCoinEVMSubWallet = null;

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
    private networkService: WalletNetworkService,
    private easyBridgeService: EasyBridgeService,
    private uniswapService: UniswapService, // Init
    private firebase: GlobalFirebaseService,
    private popupService: GlobalPopupService,
    public globalNativeService: GlobalNativeService,
    private erc20CoinService: ERC20CoinService,
    private dAppBrowserService: DappBrowserService,
    private evmService: EVMService,
  ) {
    GlobalFirebaseService.instance.logEvent("easybridge_home_enter");
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('easybridge.home-title'));
  }

  ionViewDidEnter() {
    void this.init();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);

    // Transfer is completed? Clean it up to restart fresh next time
    if (this.activeTransfer && this.activeTransfer.currentStep === TransferStep.COMPLETED) {
      void this.activeTransfer.reset();
    }
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

      if (this.activeTransfer.currentStep !== TransferStep.NEW)
        this.canEditFields = false;

      this.subscribeToTransferStatus();

      // Update UI with saved data
      this.transferAmount = this.activeTransfer.amount;
      let sourceNetwork = <EVMNetwork>this.networkService.getNetworkByChainId(this.activeTransfer.sourceToken.chainId);
      if (await this.loadWalletAndAddress(this.activeTransfer.masterWalletId, sourceNetwork)) {
        this.fetchSourceTokensBalances();
        this.selectedDestinationToken = {
          token: this.activeTransfer.destinationToken,
          estimatedAmount: new BigNumber(0)
        };
      }
    }

    this.initializing = false;
  }

  private async prepareForNewTransfer() {
    if (await this.loadWalletAndAddress(this.walletService.activeMasterWalletId, <EVMNetwork>this.networkService.activeNetwork.value)) {
      this.fetchSourceTokensBalances();
    }
  }

  private async loadWalletAndAddress(masterWalletId: string, network: EVMNetwork): Promise<boolean> {
    // Load the master wallet
    this.masterWallet = this.walletService.getMasterWallet(masterWalletId);

    // Find the matching EVM address - to make sure, we load an arbitrary EVM network to get the common EVM address
    let elastosSmartChain = this.networkService.getNetworkByKey("elastossmartchain");
    let elastosNetworkWallet = await elastosSmartChain.createNetworkWallet(this.masterWallet, false);
    if (!elastosNetworkWallet) {
      // Failed to initialize an EVM network wallet for the active subwallet. Could be for instance if
      // we are using a multisig elastos mainchain wallet. In such case, informa user and exit
      void this.popupService.ionicAlert("easybridge.unsupported-wallet", "easybridge.unsupported-wallet-info");
      void this.globalNavService.navigateBack();
      return false;
    }

    this.evmWalletAddress = await elastosNetworkWallet.getMainEvmSubWallet().getAccountAddress(AddressUsage.EVM_CALL);

    return true;
  }

  private fetchSourceTokensBalances() {
    // Start fetching balances and populate the UI list are they arrive.
    this.fetchingTokens = true;
    this.easyBridgeService.fetchBridgeableBalances(this.evmWalletAddress).subscribe({
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

  private async refreshActiveTransferSourceTokenBalance() {
    if (!this.selectedSourceToken)
      return;

    try {
      let walletAddress = await this.activeTransfer.getWalletAddress();
      let sourceNetwork = <EVMNetwork>this.networkService.getNetworkByChainId(this.activeTransfer.sourceToken.chainId);

      let chainBalance: BigNumber;
      if (this.activeTransfer.sourceToken.isNative) {
        let web3 = await this.evmService.getWeb3(sourceNetwork);
        chainBalance = new BigNumber(await web3.eth.getBalance(walletAddress));
      } else {
        chainBalance = await this.erc20CoinService.fetchERC20TokenBalance(sourceNetwork, this.activeTransfer.sourceToken.address, walletAddress);
      }

      let readableAmount = this.erc20CoinService.toHumanReadableAmount(chainBalance, this.activeTransfer.sourceToken.decimals);
      this.selectedSourceToken.balance = readableAmount;
    }
    catch (e) {
      Logger.warn("easybridge", "Refresh source token balance error:", e);
      // Silent catch, not blocking...
    }
  }

  public getWalletName(): string {
    if (!this.masterWallet)
      return null;

    return this.masterWallet.name;
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
    this.selectedDestinationToken = null;
    this.transferAmount = null;

    this.updateDestinationTokens();
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
   * Transfer amount changed by user on UI
   */
  public transferAmountChanged() {
    if (this.transferIsBeingComputed || this.transferStarted) // Transfer is being computed or executed - don't allow to change things
      return;

    void this.recomputeTransfer();
  }

  public transferAmountFocused(event, input: IonInput) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      (await input.getInputElement()).scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }

  /**
   * Rebuilds the list of possible destination tokens based on the selected source token.
   */
  private updateDestinationTokens() {
    // Support for ESC only for now
    this.destinationTokens = this.easyBridgeService.getUsableDestinationTokens(this.selectedSourceToken, 20);
    if (this.destinationTokens.length == 1) {
      // Only one destination token, select it for convenience
      void this.selectDestinationToken(this.destinationTokens[0]);
    }
  }

  private async recomputeTransfer() {
    this.lastError = null;

    if (!(this.transferAmount > 0))
      return;

    Logger.log("easybridge", "Recomputing transfer info", this.transferAmount);

    // Make sure there is enough balance
    if (this.selectedSourceToken.balance.lt(this.transferAmount)) {
      this.lastError = GlobalTranslationService.instance.translateInstant("easybridge.not-enough-tokens");
      return;
    }

    this.zone.run(() => {
      this.unsubscribeFromTransferStatus();
      this.activeTransfer = null;
      this.transferIsBeingComputed = true;
    });

    let transfer = await Transfer.prepareNewTransfer(this.masterWallet.id, this.selectedSourceToken.token, this.selectedDestinationToken.token, this.transferAmount);

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
      this.lastError = status.lastError;
    });
  }

  private unsubscribeFromTransferStatus() {
    if (this.transferStatusSub) {
      this.transferStatusSub.unsubscribe();
      this.transferStatusSub = null;
    }
  }

  public getTransferButtonText(): string {
    if (!this.activeTransfer || this.activeTransfer.currentStep === TransferStep.NEW)
      return this.translate.instant("easybridge.start-transfer");
    else
      return this.translate.instant("easybridge.resume-transfer");
  }

  public canTransfer(): boolean {
    return this.activeTransferCanContinue && this.activeTransfer && this.activeTransfer.canExecute &&
      !!this.selectedDestinationToken && !!this.selectedSourceToken &&
      !!this.transferAmount && !this.transferStarted &&
      !this.userAmountBelowMinAmount() &&
      this.selectedSourceToken.balance.gte(this.transferAmount); // Balance should be high enough
  }

  public canReset(): boolean {
    return this.activeTransferCanDismiss || (this.activeTransfer && this.activeTransfer.currentStep == TransferStep.NEW);
  }

  public userAmountBelowMinAmount(): boolean {
    if (!this.activeTransfer)
      return false;

    return this.transferAmount < this.activeTransfer.bridgeStep.minTx;
  }

  /**
   * Starts or continues the transfer process where it was interrupted.
   */
  public async transfer() {
    if (!this.activeTransfer.hasUserAgreement()) {
      let agreed = await this.popupService.showConfirmationPopup(
        this.translate.instant("easybridge.transfer-agreement-title"),
        this.translate.instant("easybridge.transfer-agreement-content")
      );
      if (agreed) {
        this.activeTransfer.approveUserAgreement();
      }
      else {
        // User agreement not accepted
        return;
      }
    }

    this.transferStarted = true;
    this.canEditFields = false;

    void this.firebase.logEvent("easybridge_transfer_start", {
      fromtoken: this.activeTransfer.sourceToken.symbol,
      totoken: this.activeTransfer.destinationToken.symbol,
      amount: this.activeTransfer.amount
    });

    await this.activeTransfer.execute();

    // Refresh selected source token balance after spending some
    void this.refreshActiveTransferSourceTokenBalance();

    this.transferStarted = false;
  }

  /**
   * Deletes current transfer state to restart from scratch.
   */
  public async reset() {
    let agreed = await this.popupService.showConfirmationPopup(
      this.translate.instant("easybridge.reset-confirmation-title"),
      this.translate.instant("easybridge.reset-confirmation-content")
    );

    if (agreed) {
      this.unsubscribeFromTransferStatus();

      if (this.activeTransfer) {  // Normally, should always be set, just in case.
        await this.activeTransfer.reset();
        this.activeTransfer = null;
      }

      this.selectedSourceToken = null;
      this.selectedDestinationToken = null;
      this.transferAmount = null;
      this.transferStarted = false;
      this.canEditFields = true;
      this.lastError = null;

      void this.prepareForNewTransfer();
    }
  }

  /**
   * User clicks the done button. We exit the screen.
   * When exiting, ths completed transfer will be cleaned up
   */
  public done() {
    void this.globalNavService.goToLauncher();
  }

  public isCompleted(): boolean {
    return this.activeTransfer && this.activeTransfer.currentStep === TransferStep.COMPLETED;
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
      return this.translate.instant("easybridge.not-started");

    return this.activeTransfer.getTransferProgressMessage();
  }

  public openGlideFinance() {
    void this.dAppBrowserService.openForBrowseMode("https://glidefinance.io", "Glide Finance");
  }
}
