import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { ETHTransactionService } from 'src/app/wallet/services/ethtransaction.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { PacketCosts } from '../../model/packetcosts.model';
import { CreatedPacket } from '../../model/packets.model';
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
  //private costs: PacketCosts = null;
  public creatingPacket = true;
  private createdPacket: CreatedPacket<PacketCosts> = null;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService,
    private paymentService: PaymentService,
    private uiService: UiService,
    private globalSwitchNetworkService: GlobalSwitchNetworkService,
    private walletService: WalletService,
    private walletNetworkService: WalletNetworkService,
    private ethTransactionService: ETHTransactionService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Finalize and pay");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    //this.costs = await this.packetService.computeCosts();
    //Logger.log("redpackets", "Computed costs:", this.costs);
  }

  async ionViewDidEnter() {
    this.createdPacket = await this.packetService.createPacket(this.packetService.getPreparedPacket())
    Logger.log("redpackets", "Created packet:", this.createdPacket);
    this.creatingPacket = false;

    // TMP DEBUG
    setInterval(() => {
      this.requestToCheckPayment();
    }, 5000);
  }

  public packetContainsERC20Tokens(): boolean {
    return !!this.packetService.getPreparedPacket().erc20ContractAddress;
  }

  public getNativeTokenSymbol(): string {
    return this.packetService.getPreparedPacketSubWallet().networkWallet.getDisplayTokenName();
  }

  /**
   * Note: this method must be called only when the red packet contains ERC20.
   * Otherwise it returns "ELA"
   */
  public getERC20TokenSymbol(): string {
    return this.packetService.getPreparedPacketSubWallet().getDisplayTokenName();
  }

  public getERC20TokenTotal(): string {
    return this.uiService.getFixedBalance(this.createdPacket.costs.erc20Token.total);
  }

  public getERC20RedPacketValue(): string {
    return this.createdPacket.costs.erc20Token.redPacket.toString();
  }

  public getNativeTokenTotal(): string {
    return this.uiService.getFixedBalance(this.createdPacket.costs.nativeToken.total);
  }

  public getNativeRedPacketValue(): string {
    return this.createdPacket.costs.nativeToken.redPacket.toString();
  }

  public getNativeTokenTxFees(): string {
    return this.uiService.getFixedBalance(this.createdPacket.costs.nativeToken.transactionFees);
  }

  public getNativeTokenServiceFeesUSD(): string {
    return this.createdPacket.costs.nativeToken.standardServiceFeesUSD.toString();
  }

  public getNativeTokenServiceFees(): string {
    return this.uiService.getFixedBalance(this.createdPacket.costs.nativeToken.standardServiceFees);
  }

  /**
   * Directly sends the required native tokens to the service
   */
  public async sendNativeToken() {
    // TODO: retrieve chain id and packet creator address
    // - switch to the right network if not on the right one
    // - get the subwallet that has this address

    let packet = this.createdPacket.request;

    // Force switch to the right network if we are on the wrong one
    let currentNetwork = this.walletNetworkService.activeNetwork.value;
    let packetNetwork = this.walletNetworkService.getNetworkByChainId(packet.chainId);
    if (packetNetwork.getMainChainID() !== currentNetwork.getMainChainID()) {
      let switched = await this.globalSwitchNetworkService.promptSwitchToNetwork(packetNetwork);
      if (!switched) {
        Logger.log("redpackets", "Can't send payment. Wrong network");
        return;
      }
    }

    // Now that we are on the right network, find the network wallet that has the right address
    let evmSubWallet = await this.walletService.findStandardEVMSubWalletByAddress(packet.creatorAddress);
    if (!evmSubWallet) {
      Logger.log("redpackets", "Can't find the wallet with which the packet was created. Unable to pay");
      return;
    }

    // TODO: why do we use Number here, not bignumbers ?
    let rawTx = await evmSubWallet.createPaymentTransaction(
      this.createdPacket.paymentAddress,
      this.createdPacket.costs.nativeToken.total.toNumber(),
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
        if (txStatus.chainId === evmSubWallet.id) {
          if (txStatus.txId - todo only if payment not existing) {
            // Transaction hash received. Save it locally to be able to retry notifying the back-end
            // later if needed (in case the backend was not accessible right now, or crashed, etc)
            await this.paymentService.createPayment(this.createdPacket.hash, txStatus.txId, PaymentType.NATIVE_TOKEN);


      todo: notify service and unsubscribe only after receiving a block hash(tx confirmed)
      // Notify the backend about this payment, so it can update the packet status
      this.paymentService.notifyServiceOfPayment(this.createdPacket.hash, txStatus.txId);

      // Stop listening, we got everything we needed
      txStatusSub.unsubscribe();
    }
        }
});
await this.ethTransactionService.publishTransaction(evmSubWallet, rawTx, transfer, true);
    }
    catch (err) {
  Logger.error('redpackets', 'publishTransaction error:', err)
}

console.log("after payment");
  }

  /**
   * Directly sends the required native ERC20 tokens to the service
   */
  public sendERC20Tokens() {

}

  private requestToCheckPayment() {
  void this.packetService.requestToCheckPayment(this.createdPacket.hash);
}
}
