import { Component, ViewChild } from '@angular/core';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { ERC20SubWallet } from 'src/app/wallet/model/wallets/erc20.subwallet';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { TokenChooserComponent } from '../../../wallet/components/token-chooser/token-chooser.component';
import { PacketCosts } from '../../model/packetcosts.model';
import { Packet, PacketDistributionType, PacketInCreation, PacketType, PacketVisibility, TokenType } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'page-new-packet',
  templateUrl: 'new-packet.html',
  styleUrls: ['./new-packet.scss'],
})
export class NewPacketPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Packet info
  public tokenSubwallet: AnySubWallet; // Subwallet of the token chosen by user for the red packet. By default, use the main EVM subwallet
  public packets: number = 19; // Number of red packets available
  public tokenAmount: string = "0.01"; // Number of token (native or ERC20) to spend, totally
  public type: PacketType = PacketType.STANDARD; // Red packet type - TODO
  public distributionType: PacketDistributionType = PacketDistributionType.RANDOM; // Fixed amount for all packets, or random amounts?
  public category = "default"; // Red packet theme: christmas, chinese new year, etc
  public message = "temporary message"; // Message shown by users who open the packet
  public probability = 100;
  public expirationDays = 3; // Number of days after which the red packet expires
  public visibility: PacketVisibility = PacketVisibility.LINK_ONLY;
  public dAppUrl = "";
  public name = ""; // Creator's name - display only - as on the DID.

  // Logic
  public creatingPacket = false;
  private createdPacket: Packet<PacketCosts> = null;
  public unsupportedNetwork = false;

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private networkSubscription: Subscription = null;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private didSessions: GlobalDIDSessionsService,
    private alertCtrl: AlertController,
    private uiService: UiService,
    private toastController: ToastController,
    private walletService: WalletService,
    private walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService,
    private modalCtrl: ModalController,
    public packetService: PacketService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("New Packet");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.name = this.didSessions.getSignedInIdentity().name;

    this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(network => {
      this.refreshNetwork();
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case "network":
          void this.walletNetworkUIService.chooseActiveNetwork();
          break;
      }
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    this.networkSubscription.unsubscribe();
  }

  public getSignedInIdentity(): IdentityEntry {
    return this.didSessions.getSignedInIdentity();
  }

  /**
   * Checks all inputs and informs user if something is wrong or missing
   */
  public validateInputs(): boolean {
    if (this.packets === undefined) {
      void this.formErr("Invalid number of packets");
      return false;
    }

    if (this.tokenAmount === undefined) {
      void this.formErr("Invalid number of tokens to distribute");
      return false;
    }

    if (this.probability === undefined || this.probability < 0 || this.probability > 100) {
      void this.formErr("Invalid probability. Use a 0-100 value");
      return false;
    }

    if (this.message.length === 0) {
      void this.formErr("Be kind with your people, send them a nice message!");
      return false;
    }

    return true;
  }

  /** Submit packet form **/
  public async createPacket() {
    if (this.creatingPacket || !this.validateInputs())
      return;

    this.creatingPacket = true;

    let targetSubWallet = this.tokenSubwallet || this.walletService.getActiveNetworkWallet().getMainEvmSubWallet();

    // Get user's EVM address
    let creatorAddress = await targetSubWallet.createAddress();

    // Prepare packet data
    let packet: PacketInCreation = {
      quantity: this.packets,
      chainId: this.tokenSubwallet.networkWallet.network.getMainChainID(),
      value: new BigNumber(this.tokenAmount),
      distributionType: this.distributionType,
      message: this.message,
      packetType: this.type,
      tokenType: this.tokenSubwallet instanceof ERC20SubWallet ? TokenType.ERC20_TOKEN : TokenType.NATIVE_TOKEN,
      creatorAddress,
      creatorDID: this.didSessions.getSignedInIdentity().didString,
      expirationDate: moment().add(this.expirationDays, "days").unix()
    };

    // For ERC20 tokens, also save the token contract address into the packet
    if (this.tokenSubwallet instanceof ERC20SubWallet) {
      packet.erc20ContractAddress = this.tokenSubwallet.coin.getContractAddress();
    }

    // Create a new packet on the backend
    this.createdPacket = await this.packetService.createPacket(packet);
    Logger.log("redpackets", "Created packet:", this.createdPacket);

    // Reach the payment screen to continue
    await this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/pay", {
      state: {
        packetHash: this.createdPacket.hash
      }
    });

    this.creatingPacket = false;
  }

  async formErr(message: string) {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'danger',
      header: 'Almost there but...',
      message,
      duration: 2000
    });
    void toast.present();
  }

  /**
   * Select the main token to put in the red packets
   */
  public async pickToken() {
    let modal = await this.modalCtrl.create({
      component: TokenChooserComponent
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
    modal.onWillDismiss().then(async (params) => {
      Logger.log('redpackets', 'Token subwallet selected:', params);
      if (params.data && params.data.selectedSubwallet) {
        if (this.tokenSubwallet && this.tokenSubwallet.id !== params.data.selectedSubwallet.id) {
          // The token is a different one, reset the amount to avoid mistakes
          this.tokenAmount = "0.01";
        }

        this.tokenSubwallet = params.data.selectedSubwallet;
      }
    });
    void modal.present();
  }

  /**
   * If the distribution type if fixed, this returns the number of tokens in each packet.
   */
  public getValuePerFixedPacket(): string {
    if (this.tokenAmount === "" || this.packets === 0)
      return "0";

    return this.uiService.getFixedBalance(new BigNumber(this.tokenAmount).dividedBy(this.packets));
  }

  /**
   * After a network change, refresh the title bar and the screen content
   */
  private refreshNetwork() {
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "network",
      iconPath: this.walletNetworkService.activeNetwork.value.logo
    });

    // Reset values that don't make sense any more after swtiching a network (need to be re-entered by user)
    this.tokenSubwallet = this.walletService.activeNetworkWallet.value.getMainEvmSubWallet();
    this.unsupportedNetwork = !this.tokenSubwallet;
    this.tokenAmount = "0.01";
    this.packets = 30;
  }
}
