import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { PacketCosts } from '../../model/packetcosts.model';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'page-pay',
  templateUrl: 'pay.html',
  styleUrls: ['./pay.scss'],
})
export class PayPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  private costs: PacketCosts = null;
  public creatingPacket = true;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService,
    private uiService: UiService
  ) { }

  async ionViewWillEnter() {
    this.titleBar.setTitle("Finalize and pay");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.costs = await this.packetService.computeCosts();
    Logger.log("redpackets", "Computed costs:", this.costs);
  }

  async ionViewDidEnter() {
    await this.packetService.createPacket(this.packetService.getPreparedPacket())
    this.creatingPacket = false;
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
    return this.uiService.getFixedBalance(this.costs.erc20Token.total);
  }

  public getERC20RedPacketValue(): string {
    return this.costs.erc20Token.redPacket.toString();
  }

  public getNativeTokenTotal(): string {
    return this.uiService.getFixedBalance(this.costs.nativeToken.total);
  }

  public getNativeRedPacketValue(): string {
    return this.costs.nativeToken.redPacket.toString();
  }

  public getNativeTokenTxFees(): string {
    return this.uiService.getFixedBalance(this.costs.nativeToken.transactionFees);
  }

  public getNativeTokenServiceFeesUSD(): string {
    return this.costs.nativeToken.standardServiceFeesUSD.toString();
  }

  public getNativeTokenServiceFees(): string {
    return this.uiService.getFixedBalance(this.costs.nativeToken.standardServiceFees);
  }

  /**
   * Directly sends the required native tokens to the service
   */
  public sendNativeToken() {

  }

  /**
   * Directly sends the required native ERC20 tokens to the service
   */
  public sendERC20Tokens() {

  }
}
