import { Component, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonInput, ModalController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { filter, Subscription, take } from 'rxjs';
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
import { Coin } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { Transfer, TransferStep } from '../../model/transfer';
import { UIToken } from '../../model/uitoken';
import { ChaingeSwapService } from '../../services/chaingeswap.service';
import { SwapUIService } from '../../services/swap.ui.service';
import { TokenChooserService } from '../../services/tokenchooser.service';

export type MultiSwapHomePageParams = {
  sourceToken?: UIToken;
  destinationToken?: UIToken;
}

/**
 * Migrator main page
 */
@Component({
  selector: 'page-multiswap-home',
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
  public canEditFields = true;
  public transferStarted = false; // Whether the transfer setup can be changed by the user (source token, amount etc). This gets disabled after the transfer button is clicked
  public lastError: string = null;

  public sourceTokens: UIToken[] = [];
  public selectedSourceToken: UIToken = null;
  public destinationTokens: UIToken[] = [];
  public selectedDestinationToken: UIToken = null;
  public transferAmount: string = null;

  private masterWallet: MasterWallet = null;
  private evmWalletAddress: string = null;
  //private mainCoinSubWallet: AnyMainCoinEVMSubWallet = null;

  public activeTransfer: Transfer = null;
  public transferIsBeingComputed = false;
  public activeTransferCanContinue = false; // According to active transfer status, whether the transfer button should be enabeld or not
  public activeTransferCanDismiss = false; // According to active transfer status, whether the dismiss button should be enabeld or not

  private transferStatusSub: Subscription;
  private computationStatusSub: Subscription;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private walletService: WalletService,
    private networkService: WalletNetworkService,
    private chaingeService: ChaingeSwapService,
    private firebase: GlobalFirebaseService,
    private popupService: GlobalPopupService,
    public globalNativeService: GlobalNativeService,
    private erc20CoinService: ERC20CoinService,
    private dAppBrowserService: DappBrowserService,
    private evmService: EVMService,
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
    private tokenChooserService: TokenChooserService,
    private swapUIService: SwapUIService
  ) {
    GlobalFirebaseService.instance.logEvent("multiswap_home_enter");

    route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        let state: MultiSwapHomePageParams = this.router.getCurrentNavigation().extras.state;

        // Source and destination tokens can be provided by the caller, or not
        this.selectedSourceToken = state.sourceToken;
        this.selectedDestinationToken = state.destinationToken;
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('launcher.swap-tokens'));
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
    Logger.log("multiswap", "Home page - initializing context");

    // Reset all balances from the chooser service so that we fetch them all every time we enter the swap screen (but not
    // while remaining in this screen).
    this.tokenChooserService.resetAllBalances();

    // Load the on going transfer from disk if there is one.
    this.activeTransfer = await Transfer.loadExistingTransfer();

    // No on going transfer? Prepare for a new one
    if (!this.activeTransfer) {
      await this.prepareForNewTransfer();
      await this.loadWalletAndAddress(this.walletService.activeMasterWalletId, <EVMNetwork>this.networkService.activeNetwork.value);
    }
    else {
      if (this.activeTransfer.currentStep !== TransferStep.NEW)
        this.canEditFields = false;

      this.subscribeToTransferStatus();

      // Update UI with saved data
      this.transferAmount = this.activeTransfer.amount.toString(10);
      let sourceNetwork = <EVMNetwork>this.activeTransfer.sourceToken.network;
      if (await this.loadWalletAndAddress(this.activeTransfer.masterWalletId, sourceNetwork)) {
        this.selectedSourceToken = {
          token: this.activeTransfer.sourceToken,
          amount: new BigNumber(0) // TODO
        };
        this.selectedDestinationToken = {
          token: this.activeTransfer.destinationToken,
          amount: new BigNumber(0) // TODO
        };
        void this.fetchSourceTokenBalance();
      }

      void this.activeTransfer.updateComputations();
    }

    this.initializing = false;

    return;
  }

  private async prepareForNewTransfer() {
    if (await this.loadWalletAndAddress(this.walletService.activeMasterWalletId, <EVMNetwork>this.networkService.activeNetwork.value)) {
      void this.fetchSourceTokenBalance();
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

  private async fetchSourceTokenBalance() {
    if (!this.selectedSourceToken)
      return;

    Logger.log("multiswap", "Fetching source token balance");
    let sourceNetworkWallet = await this.selectedSourceToken.token.network.createNetworkWallet(this.masterWallet, false);
    this.tokenChooserService.getCoinBalance(this.selectedSourceToken.token, this.evmWalletAddress, sourceNetworkWallet).pipe(filter(val => val !== null), take(1)).subscribe(balance => {
      Logger.log("multiswap", "Got source token balance:", balance);
      if (balance !== null) {
        this.selectedSourceToken.amount = balance;
      }
    });
  }

  private async refreshActiveTransferSourceTokenBalance() {
    /* if (!this.selectedSourceToken)
      return;

    try {
      let walletAddress = this.activeTransfer.getWalletAddress();
      let sourceNetwork = <EVMNetwork>this.activeTransfer.sourceToken.network;

      let chainBalance: BigNumber;
      if (this.activeTransfer.sourceToken instanceof NativeCoin) {
        let web3 = await this.evmService.getWeb3(sourceNetwork);
        chainBalance = new BigNumber(await web3.eth.getBalance(walletAddress));
      } else {
        chainBalance = await this.erc20CoinService.fetchERC20TokenBalance(sourceNetwork, this.activeTransfer.sourceToken.address, walletAddress);
      }

      let readableAmount = this.erc20CoinService.toHumanReadableAmount(chainBalance, this.activeTransfer.sourceToken.decimals);
      this.selectedSourceToken.balance = readableAmount;
    }
    catch (e) {
      Logger.warn("multiswap", "Refresh source token balance error:", e);
      // Silent catch, not blocking...
    } */
  }

  public getWalletName(): string {
    if (!this.masterWallet)
      return null;

    return this.masterWallet.name;
  }

  public getDisplayableAmount(readableBalance: BigNumber): string {
    return readableBalance.toPrecision(5);
  }

  public getTokenLogo(token: Coin): string {
    return token.network.logo;
  }

  public getDisplayableSwapFees(): string {
    return this.activeTransfer.swapStep.fees.toFixed(5);
  }

  public getDisplayableSwapFeesPercent(): string {
    return (this.activeTransfer.swapStep.feesPercent * 100).toFixed(2);
  }

  public getDisplayableSwapPriceImpact(): string {
    if (this.activeTransfer.swapStep.slippage)
      return (this.activeTransfer.swapStep.slippage * 100).toFixed(2);
    else
      return null;
  }

  public getEstimatedReceivedAmount(): string {
    return this.getDisplayableAmount(this.activeTransfer.estimatedReceivedAmount);
  }

  /**
   * Opens the token chooser to select the soure token.
   */
  public async pickSourceToken() {
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
      return;

    const selectedToken = await this.pickToken(true);
    void this.selectSourceToken(selectedToken);
  }

  public async pickDestinationToken() {
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
      return;

    const selectedToken = await this.pickToken(false);
    void this.selectDestinationToken(selectedToken);
  }

  private pickToken(forSource: boolean): Promise<UIToken> {
    return this.swapUIService.pickToken(forSource, forSource || !this.selectedSourceToken ? null : this.selectedSourceToken.token)
  }

  public selectSourceToken(sourceToken: UIToken) {
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
      return;

    // Unselect, if it was selected
    if (this.selectedSourceToken && !sourceToken) {
      this.selectedSourceToken = null;
      return;
    }

    this.selectedSourceToken = sourceToken;
    this.transferAmount = null;

    this.recomputeTransfer();
  }

  public selectDestinationToken(destinationToken: UIToken) {
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
      return;

    // Unselect, if it was selected
    if (this.selectedDestinationToken && !destinationToken) {
      this.selectedDestinationToken = null;
      return;
    }

    this.selectedDestinationToken = destinationToken;
    this.transferAmount = null;

    this.recomputeTransfer();
  }

  /**
   * Inverts source nad destination tokens.
   */
  public switchTokens() {
    if (this.transferIsBeingComputed || !this.canEditFields) // Transfer is being computed or executed - don't allow to change things
      return;

    // Exchange source and dest
    let tmpToken = this.selectedSourceToken;
    this.selectedSourceToken = this.selectedDestinationToken;
    this.selectedDestinationToken = tmpToken;

    // Reset amount
    this.transferAmount = null;

    this.recomputeTransfer();
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
    /*  this.destinationTokens = this.easyBridgeService.getUsableDestinationTokens(this.selectedSourceToken, 20);
     if (this.destinationTokens.length == 1) {
       // Only one destination token, select it for convenience
       void this.selectDestinationToken(this.destinationTokens[0]);
     } */
  }

  private recomputeTransfer() {
    this.lastError = null;

    const transferAmountBN = new BigNumber(this.transferAmount);
    if (!(transferAmountBN.gt(0)))
      return;

    Logger.log("multiswap", "Recomputing transfer info", this.transferAmount);

    // Make sure there is enough balance
    if (this.selectedSourceToken.amount.lt(this.transferAmount)) {
      this.lastError = GlobalTranslationService.instance.translateInstant("easybridge.not-enough-tokens");
      return;
    }

    this.zone.run(() => {
      this.unsubscribeFromTransferStatus();
      this.activeTransfer = null;
    });

    let transfer = Transfer.prepareNewTransfer(this.masterWallet.id, this.selectedSourceToken.token, this.selectedDestinationToken.token, transferAmountBN);

    Logger.log("multiswap", "Transfer computation result:", transfer);

    this.zone.run(() => {
      this.activeTransfer = transfer;
      this.subscribeToTransferStatus();
    });
  }

  private subscribeToTransferStatus() {
    this.transferStatusSub = this.activeTransfer.status.subscribe(status => {
      Logger.log("multiswap", "Transfer status:", status);
      this.activeTransferCanContinue = status.canContinue;
      this.activeTransferCanDismiss = status.canDismiss;
      this.lastError = status.lastError;
    });

    this.computationStatusSub = this.activeTransfer.computing.subscribe(isComputing => {
      this.transferIsBeingComputed = isComputing;
    });
  }

  private unsubscribeFromTransferStatus() {
    if (this.transferStatusSub) {
      this.transferStatusSub.unsubscribe();
      this.transferStatusSub = null;
    }

    if (this.computationStatusSub) {
      this.computationStatusSub.unsubscribe();
      this.computationStatusSub = null;
    }
  }

  public getTransferButtonText(): string {
    if (!this.activeTransfer || this.activeTransfer.currentStep === TransferStep.NEW)
      return this.translate.instant("easybridge.start-transfer");
    else
      return this.translate.instant("easybridge.resume-transfer");
  }

  public canTransfer(): boolean {
    return this.activeTransferCanContinue && this.activeTransfer &&
      !this.transferIsBeingComputed &&
      !this.lastError &&
      !!this.selectedDestinationToken && !!this.selectedSourceToken &&
      !!this.transferAmount && !this.transferStarted &&
      this.selectedSourceToken.amount.gte(this.transferAmount); // Balance should be high enough
  }

  /**
   * Starts or continues the transfer process where it was interrupted.
   */
  public async transfer() {
    this.transferStarted = true;
    this.canEditFields = false;

    void this.firebase.logEvent("multiswap_transfer_start", {
      fromtoken: this.activeTransfer.sourceToken.getSymbol(),
      fromchain: this.activeTransfer.sourceToken.network.key,
      totoken: this.activeTransfer.destinationToken.getSymbol(),
      tochain: this.activeTransfer.destinationToken.network.key,
      amount: this.activeTransfer.amount
    });

    await this.activeTransfer.execute();

    // Log "completed" only if really completed transfer
    if (this.activeTransfer.status.value.step === TransferStep.COMPLETED) {
      void this.firebase.logEvent("multiswap_transfer_completed", {
        fromtoken: this.activeTransfer.sourceToken.getSymbol(),
        fromchain: this.activeTransfer.sourceToken.network.key,
        totoken: this.activeTransfer.destinationToken.getSymbol(),
        tochain: this.activeTransfer.destinationToken.network.key,
        amount: this.activeTransfer.amount
      });
    }

    // Refresh selected source token balance after spending some
    void this.refreshActiveTransferSourceTokenBalance();

    this.transferStarted = false;
  }

  public canReset(): boolean {
    return this.activeTransferCanDismiss || (this.activeTransfer && this.activeTransfer.currentStep == TransferStep.NEW);
  }

  /**
   * Deletes current transfer state to restart from scratch.
   */
  public async reset() {
    let agreed = await this.popupService.showConfirmationPopup(
      this.translate.instant("easybridge.reset-confirmation-title"),
      this.translate.instant("multiswap.reset-confirmation-content"),
      undefined,
      "/assets/launcher/widgets/swap-widget-icon.svg"
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
