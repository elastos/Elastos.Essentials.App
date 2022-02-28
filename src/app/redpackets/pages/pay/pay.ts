import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { ETHTransactionStatus } from 'src/app/wallet/model/networks/evms/evm.types';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { Packet, PacketVisibility, TokenType } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';
import { PaymentService, PaymentType } from '../../services/payment.service';

@Component({
  selector: 'page-pay',
  templateUrl: 'pay.html',
  styleUrls: ['./pay.scss'],
})
export class PayPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public fetchingPacketInfo = true;
  public packet: Packet = null;
  private packetHash: string;
  //private costs: PacketCosts = null;
  public sendingNativePayment = false;
  public sendingERC20Payment = false;
  public nativeTokenBalanceIsEnough = false; // Enough native tokens to pay for the packet
  public erc20TokenBalanceIsEnough = false; // Enough ERC20 tokens to pay for the packet
  public currentNativeBalance = "";
  public currentERC20Balance = "";
  public nativePaymentStepError: string = null;
  public erc20PaymentStepError: string = null;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private route: ActivatedRoute,
    private router: Router,
    public packetService: PacketService,
    private paymentService: PaymentService,
    private uiService: UiService,
    private globalSwitchNetworkService: GlobalSwitchNetworkService,
    private walletService: WalletService,
    private walletNetworkService: WalletNetworkService,
    private ethTransactionService: EVMService,
    private translate: TranslateService
  ) {
    route.queryParams.subscribe(() => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.packetHash = this.router.getCurrentNavigation().extras.state.packetHash;
        void this.fetchPacketInfo();
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.payment-title"));
    this.titleBar.setBackgroundColor("#701919");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  /**
   * From a packet hash, fetch packet info from the server to know its status and continue the
   * payment where it was stopped
   */
  private async fetchPacketInfo() {
    this.packet = await this.packetService.getPacketInfo(this.packetHash);
    Logger.log("redpackets", "Packet to pay", this.packet);

    // After getting a packet info (including costs), check if user balances are sufficient
    await this.checkWalletBalances();

    this.fetchingPacketInfo = false;
  }

  private async checkWalletBalances(): Promise<void> {
    this.nativeTokenBalanceIsEnough = false;
    this.erc20TokenBalanceIsEnough = false;

    if (!this.packet)
      return;

    let evmSubWallet = await this.getNativePaymentSubWallet();
    if (!evmSubWallet)
      return;

    this.currentNativeBalance = evmSubWallet.getBalance().toFixed(4);

    if (this.packet.tokenType === TokenType.NATIVE_TOKEN) {
      // Native packet: make sure that:
      // - balance of native token > packet total cost (native) + fee for one native transaction

      let nativeTransactionFees = await evmSubWallet.estimateTransferTransactionFees(); // human readable

      let totalCost = new BigNumber(nativeTransactionFees).plus(this.packet.costs.nativeToken.total);
      if (evmSubWallet.getBalance().gt(totalCost)) {
        this.nativeTokenBalanceIsEnough = true;
        Logger.log("redpackets", `All good, balance of native coin is enough. ${evmSubWallet.getBalance().toString()} owned. Cost is ${totalCost.toString()}`)
      }
      else {
        Logger.warn("redpackets", `Balance of native coin is not enough. ${evmSubWallet.getBalance().toString()} owned but cost is ${totalCost.toString()}`)
      }
    }
    else if (this.packet.tokenType === TokenType.ERC20_TOKEN) {
      // ERC20 packet: make sure that:
      // - balance of erc20 >= packet total cost (erc20)
      // and:
      // - balance of native token > fee for one ERC20 transaction * 2 (to avoid gas price fluctuation issues)

      let erc20SubWallet = await this.getERC20PaymentSubWallet();
      if (!erc20SubWallet)
        return;

      // Check ERC20 tokens balance
      this.currentERC20Balance = erc20SubWallet.getBalance().toFixed(4);
      if (erc20SubWallet.getBalance().gte(this.packet.costs.erc20Token.total)) {
        this.erc20TokenBalanceIsEnough = true;
        Logger.log("redpackets", `All good, balance of ERC20 coin is enough. ${erc20SubWallet.getBalance().toString()} owned. Cost is ${this.packet.costs.erc20Token.total.toString()}`);
      }
      else {
        Logger.warn("redpackets", `Balance of ERC20 token is not enough. ${erc20SubWallet.getBalance().toString()} owned but cost is ${this.packet.costs.erc20Token.total.toString()}`);
      }

      // Also check the erc20 coin transaction fee cost in native coin
      // Multiply by 2 to have a bit of margin regarding gas price fluctuation on some networks
      let erc20TransferCostInNativeCoin = await (await evmSubWallet.estimateERC20TransferTransactionFees(this.packet.erc20ContractAddress)).multipliedBy(2);
      if (evmSubWallet.getBalance().gt(erc20TransferCostInNativeCoin)) {
        this.nativeTokenBalanceIsEnough = true;
        Logger.log("redpackets", `All good, balance of native coin is enough. ${evmSubWallet.getBalance().toString()} owned. Cost is ${erc20TransferCostInNativeCoin.toString()}`)
      }
      else {
        Logger.warn("redpackets", `Balance of native coin is not enough. ${evmSubWallet.getBalance().toString()} owned but cost is ${erc20TransferCostInNativeCoin.toString()}`)
      }
    }
  }

  public packetContainsERC20Tokens(): boolean {
    return !!this.packet.erc20ContractAddress;
  }

  public getPacketSymbol(): string {
    return this.packet.tokenType === TokenType.NATIVE_TOKEN ? this.getNativeTokenSymbol() : this.getERC20TokenSymbol();
  }

  public getNativeTokenSymbol(): string {
    return this.packet.nativeTokenSymbol;
  }

  public isNativePaymentCompleted(): boolean {
    return !!this.packet.paymentStatus.nativeToken;
  }

  public isERC20PaymentCompleted(): boolean {
    return !!this.packet.paymentStatus.erc20Token;
  }

  public areAllPaymentsCompleted(): boolean {
    if (this.packet.tokenType === TokenType.NATIVE_TOKEN)
      return this.isNativePaymentCompleted();
    else
      return this.isNativePaymentCompleted() && this.isERC20PaymentCompleted();
  }

  /**
   * Note: this method must be called only when the red packet contains ERC20.
   * Otherwise it returns "ELA"
   */
  public getERC20TokenSymbol(): string {
    return this.packet.erc20TokenSymbol;
  }

  public getERC20TokenTotal(): string {
    return this.uiService.getFixedBalance(this.packet.costs.erc20Token.total);
  }

  public getERC20RedPacketValue(): string {
    return this.packet.costs.erc20Token.redPacket.toString();
  }

  public getNativeTokenTotal(): string {
    return this.uiService.getFixedBalance(this.packet.costs.nativeToken.total);
  }

  public getNativeRedPacketValue(): string {
    return this.packet.costs.nativeToken.redPacket.toString();
  }

  public getNativeTokenTxFees(): string {
    return this.uiService.getFixedBalance(this.packet.costs.nativeToken.transactionFees);
  }

  public getNativeTokenServiceFeesUSD(): string {
    return this.packet.costs.nativeToken.standardServiceFeesUSD.toString();
  }

  public getNativeTokenServiceFees(): string {
    return this.uiService.getFixedBalance(this.packet.costs.nativeToken.standardServiceFees);
  }

  public getNativeTokenPublicOptionFees(): string {
    return this.packet.costs.nativeToken.options.publicPacketFees.toString();
  }

  public getERC20TokenPublicOptionFees(): string {
    return this.packet.costs.erc20Token.options.publicPacketFees.toString();
  }

  // ie: $5
  public getPublicOptionNativeFeesUSD(): string {
    return this.packet.costs.nativeToken.options.publicPacketFeesUSD.toString();
  }

  public getPublicOptionFeesPercentage(): string {
    return this.packet.tokenType === TokenType.NATIVE_TOKEN ? this.packet.costs.nativeToken.options.publicPacketFeesTokenPercent.toString() : this.packet.costs.erc20Token.options.publicPacketFeesTokenPercent.toString();
  }

  private async checkRightNetwork(): Promise<boolean> {
    // Force switch to the right network if we are on the wrong one
    let currentNetwork = this.walletNetworkService.activeNetwork.value;
    let packetNetwork = this.walletNetworkService.getNetworkByChainId(this.packet.chainId);
    if (packetNetwork.getMainChainID() !== currentNetwork.getMainChainID()) {
      let switched = await this.globalSwitchNetworkService.promptSwitchToNetwork(packetNetwork);
      if (!switched) {
        Logger.log("redpackets", "Can't send payment. Wrong network");
        return false;
      }
    }
    return true;
  }

  private async getNativePaymentSubWallet(): Promise<AnyMainCoinEVMSubWallet> {
    // Now that we are on the right network, find the network wallet that has the right address
    let evmSubWallet = await this.walletService.findStandardEVMSubWalletByAddress(this.packet.creatorAddress);
    if (!evmSubWallet) {
      Logger.log("redpackets", "Can't find the wallet with which the packet was created. Unable to pay");
      return null;
    }
    return evmSubWallet;
  }

  private async getERC20PaymentSubWallet(): Promise<ERC20SubWallet> {
    let erc20SubWallet = await this.walletService.findERC20SubWalletByContractAddress(this.packet.erc20ContractAddress, this.packet.creatorAddress);
    if (!erc20SubWallet) {
      Logger.error("redpackets", "Can't find the ERC20 subwallet with which the packet was created. Unable to pay");
      return null;
    }
    return erc20SubWallet;
  }

  /**
   * Directly sends the required native tokens to the service
   */
  public async sendNativeToken() {
    if (this.sendingNativePayment)
      return;

    if (!await this.checkRightNetwork())
      return;

    let evmSubWallet = await this.getNativePaymentSubWallet();
    if (!evmSubWallet)
      return;

    this.sendingNativePayment = true;

    let rawTx = await evmSubWallet.createPaymentTransaction(
      this.packet.paymentAddress,
      this.packet.costs.nativeToken.total,
      "", null, null, -1);

    console.log("Payment rawTx", rawTx);

    const transfer = new Transfer();
    Object.assign(transfer, {
      masterWalletId: evmSubWallet.masterWallet.id,
      subWalletId: evmSubWallet.id,
      rawTransaction: rawTx,
      action: null,
      intentId: null
    });

    try {
      // Listen to transaction events in order to catch the published transaction hash.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      let txStatusSub = this.ethTransactionService.ethTransactionStatus.subscribe(async txStatus => {
        // Make sure we are receiving a status for our current operation, not for something else
        // Note: this check if far from being robust, let's assume for now that there is only one on going
        // transaction at a time... Can't do much better over the existing mechanism.
        if (txStatus.chainId === evmSubWallet.id) {
          if (txStatus.txId && !this.paymentService.getPaymentByTransactionHash(txStatus.txId)) {
            // Transaction hash received. Save it locally to be able to retry notifying the back-end
            // later if needed (in case the backend was not accessible right now, or crashed, etc)
            Logger.log("redpackets", "Transaction hash received for the payment. Creating a payment entry");
            await this.paymentService.createPayment(this.packet.hash, txStatus.txId, PaymentType.NATIVE_TOKEN);
          }

          if (txStatus.status === ETHTransactionStatus.PACKED) {
            // Notify the backend about this payment, so it can update the packet status
            Logger.log("redpackets", "Transaction has been packed on chain. Telling this to the backend");
            let notifiedPaymentStatus = await this.paymentService.notifyServiceOfPayment(this.packet.hash, txStatus.txId, TokenType.NATIVE_TOKEN);
            if (notifiedPaymentStatus) {
              if (notifiedPaymentStatus.confirmed) {
                // Payment is confirmed by the backend
                this.packet.paymentStatus.nativeToken = notifiedPaymentStatus.payment;
                await this.checkAllPaymentsCompleted();
              }
              else {
                // Payment could not be confirmed by the backend
                this.nativePaymentStepError = notifiedPaymentStatus.errorMessage;
              }
            }
            else {
              // Networking or other unexpected error during notification of payment -
              this.nativePaymentStepError = "Unknown error";
            }

            this.sendingNativePayment = false;

            // Stop listening, we got everything we needed
            txStatusSub.unsubscribe();
          } else if (txStatus.status === ETHTransactionStatus.CANCEL) {
            this.sendingNativePayment = false;
          }
        }
      });
      await this.ethTransactionService.publishTransaction(evmSubWallet, rawTx, transfer);
    }
    catch (err) {
      Logger.error('redpackets', 'publishTransaction error:', err)
    }

    console.log("after native payment");
  }

  /**
   * Directly sends the required native ERC20 tokens to the service
   */
  public async sendERC20Tokens() {
    if (this.sendingERC20Payment)
      return;

    if (!await this.checkRightNetwork())
      return;

    // Now that we are on the right network, find the token subwallet
    let erc20SubWallet = await this.getERC20PaymentSubWallet();
    if (!erc20SubWallet)
      return;

    let evmSubWallet = await this.getNativePaymentSubWallet();
    if (!evmSubWallet)
      return;

    this.sendingERC20Payment = true;

    let rawTx = await erc20SubWallet.createPaymentTransaction(
      this.packet.paymentAddress,
      this.packet.costs.erc20Token.total,
      "", null, null, -1);

    console.log("Payment rawTx", rawTx);

    const transfer = new Transfer();
    Object.assign(transfer, {
      masterWalletId: erc20SubWallet.masterWallet.id,
      subWalletId: erc20SubWallet.id,
      rawTransaction: rawTx,
      action: null,
      intentId: null
    });

    try {
      // Listen to transaction events in order to catch the published transaction hash.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      let txStatusSub = this.ethTransactionService.ethTransactionStatus.subscribe(async txStatus => {
        // Make sure we are receiving a status for our current operation, not for something else
        // Note: this check if far from being robust, let's assume for now that there is only one on going
        // transaction at a time... Can't do much better over the existing mechanism.
        if (txStatus.chainId === evmSubWallet.id) {
          if (txStatus.txId && !this.paymentService.getPaymentByTransactionHash(txStatus.txId)) {
            // Transaction hash received. Save it locally to be able to retry notifying the back-end
            // later if needed (in case the backend was not accessible right now, or crashed, etc)
            Logger.log("redpackets", "Transaction hash received for the payment. Creating a payment entry");
            await this.paymentService.createPayment(this.packet.hash, txStatus.txId, PaymentType.ERC20_TOKEN);
          }

          if (txStatus.status === ETHTransactionStatus.PACKED) {
            // Notify the backend about this payment, so it can update the packet status
            Logger.log("redpackets", "Transaction has been packed on chain. Telling this to the backend");
            let notifiedPaymentStatus = await this.paymentService.notifyServiceOfPayment(this.packet.hash, txStatus.txId, TokenType.ERC20_TOKEN);
            if (notifiedPaymentStatus) {
              if (notifiedPaymentStatus.confirmed) {
                // Payment is confirmed by the backend
                this.packet.paymentStatus.erc20Token = notifiedPaymentStatus.payment;
                await this.checkAllPaymentsCompleted();
              }
              else {
                // Payment could not be confirmed by the backend
                this.erc20PaymentStepError = notifiedPaymentStatus.errorMessage;
              }
            }
            else {
              // Networking or other unexpected error during notification of payment -
              this.erc20PaymentStepError = "Unknown error";
            }

            this.sendingERC20Payment = false;

            // Stop listening, we got everything we needed
            txStatusSub.unsubscribe();
          }
        }
        else if (txStatus.status === ETHTransactionStatus.CANCEL) {
          this.sendingERC20Payment = false;
          txStatusSub.unsubscribe();
        }
      });
      let test = await this.ethTransactionService.publishTransaction(evmSubWallet, rawTx, transfer);
      console.log("TEST TX", test);
    }
    catch (err) {
      Logger.error('redpackets', 'publishTransaction ERC20 error:', err)
    }

    console.log("after erc20 payment");
  }

  private async checkAllPaymentsCompleted(): Promise<void> {
    if (this.areAllPaymentsCompleted()) {
      // Update local cache with latest info (ie: isActive, paymentStatus) - fetch a fresh status
      this.packet = await this.packetService.getPacketInfo(this.packet.hash);
      await this.packetService.updateToMyPackets(this.packet);

      // As we've just finished funding a new packet, if this is a public, we reload the public packets
      // to get a fresh list on the home screen
      if (this.packet.visibility == PacketVisibility.PUBLIC) {
        void this.packetService.fetchPublicPackets();
      }
    }
  }

  public openPacketDetails() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/packet-details", {
      state: {
        packet: this.packet
      }
    });

    // Remove the packet payment screen from the history to not come back
    this.globalNavService.clearIntermediateRoutes(["/redpackets/pay"]);
  }
}
