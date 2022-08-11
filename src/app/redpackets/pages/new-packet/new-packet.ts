import { Component, ViewChild } from '@angular/core';
import { AlertController, IonSlides, ModalController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { GlobalThemeService } from "../../../services/global.theme.service";
import { TokenChooserComponent } from '../../../wallet/components/token-chooser/token-chooser.component';
import { Packet, PacketDistributionType, PacketToCreate, PacketType, PacketVisibility, TokenType } from '../../model/packets.model';
import { NetworksService } from '../../services/networks.service';
import { PacketService } from '../../services/packet.service';
import { RedPacketTheme, ThemeService } from '../../services/theme.service';

@Component({
  selector: 'page-new-packet',
  templateUrl: 'new-packet.html',
  styleUrls: ['./new-packet.scss'],
})
export class NewPacketPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild('categorySlides', { read: IonSlides }) categorySlides: IonSlides;

  // Packet info
  public tokenSubwallet: AnySubWallet; // Subwallet of the token chosen by user for the red packet. By default, use the main EVM subwallet
  public packets: number = null; // Number of red packets available
  public tokenAmount = ""; // Number of token (native or ERC20) to spend, totally
  public type: PacketType = PacketType.STANDARD; // Red packet type
  public distributionType: PacketDistributionType = PacketDistributionType.RANDOM; // Fixed amount for all packets, or random amounts?
  public packetTheme: RedPacketTheme = null;
  public message = ""; // Message shown by users who open the packet
  public probability = 100;
  public probabilityPercent = "100%";
  public expirationDays = 3; // Number of days after which the red packet expires
  public visibility: PacketVisibility = PacketVisibility.LINK_ONLY;
  public dAppUrl = "";
  public name = ""; // Creator's name - display only - as on the DID.

  // Model
  public themes: RedPacketTheme[] = [];

  // Logic
  public creatingPacket = false;
  private createdPacket: Packet = null;
  public unsupportedNetwork = false;

  // UI
  public slideOpts = {
    slidesPerView: 2.7,
    spaceBetween: 10,
  };

  public distributionSelectOption: any = {
    header: this.translate.instant("redpackets.distribution"),
    cssClass: this.theme.darkMode ? "darkSelect" : "select",
  };

  public visibilitySelectOption: any = {
    header: this.translate.instant("redpackets.visibility"),
    cssClass: this.theme.darkMode ? "darkSelect" : "select",
  };

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private networkSubscription: Subscription = null;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private didSessions: GlobalDIDSessionsService,
    private alertCtrl: AlertController,
    private uiService: UiService,
    private globalNativeServce: GlobalNativeService,
    private walletService: WalletService,
    private walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    public packetService: PacketService,
    private themeService: ThemeService,
    private networksService: NetworksService
  ) {
    GlobalFirebaseService.instance.logEvent("redpacket_new_enter");
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.new-red-packet-title"));
    this.titleBar.setBackgroundColor("#701919");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.name = this.didSessions.getSignedInIdentity().name;

    this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(() => {
      this.refreshNetwork();
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case "network":
          void this.walletNetworkUIService.chooseActiveNetwork();
          break;
      }
    });

    this.themes = this.themeService.getAvailableThemes();
    this.packetTheme = this.themeService.getDefaultTheme();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
      this.networkSubscription = null;
    }
  }

  public getSignedInIdentity(): IdentityEntry {
    return this.didSessions.getSignedInIdentity();
  }

  updateProbability(probability: number): void {
    probability = parseFloat(probability.toString().replace("%", ""));
    if (probability > 100) {
      probability = 100;
    }
    if (probability < 0) {
      probability = 0;
    }
    this.probability = probability;
    this.probabilityPercent = probability + '%';
  }

  /**
   * Checks all inputs and informs user if something is wrong or missing
   */
  public validateInputs(): boolean {
    if (!this.packets) {
      void this.formErr(this.translate.instant("redpackets.error-invalid-number-of-packets"));
      return false;
    }

    const packetsBN = new BigNumber(this.packets);
    if (packetsBN.isNaN() || !packetsBN.isInteger() || !packetsBN.gte(1)) {
      void this.formErr(this.translate.instant("redpackets.error-invalid-number-of-packets"));
      return false;
    }

    const tokenAmountBN = new BigNumber(this.tokenAmount);
    if (tokenAmountBN.isNaN() || tokenAmountBN.lte(0)) {
      void this.formErr(this.translate.instant("redpackets.error-invalid-number-of-tokens"));
      return false;
    }

    if (!this.probability || this.probability < 0 || this.probability > 100) {
      void this.formErr(this.translate.instant("redpackets.error-invalid-probability"));
      return false;
    }

    if (!this.expirationDays || this.expirationDays < 1 || this.expirationDays > 7) {
      void this.formErr(this.translate.instant("redpackets.error-invalid-expiration-time"));
      return false;
    }

    if (this.message.length === 0) {
      void this.formErr(this.translate.instant("redpackets.error-no-message"));
      return false;
    }

    if (this.message.length > 200) {
      void this.formErr(this.translate.instant("redpackets.error-message-too-long"));
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
    let creatorAddress = await targetSubWallet.getCurrentReceiverAddress();

    // Prepare packet data
    let packet: PacketToCreate = {
      quantity: this.packets,
      category: this.packetTheme.key,
      chainId: (this.tokenSubwallet.networkWallet.network as EVMNetwork).getMainChainID(),
      value: new BigNumber(this.tokenAmount),
      distributionType: this.distributionType,
      message: this.message,
      packetType: this.type,
      tokenType: this.tokenSubwallet instanceof ERC20SubWallet ? TokenType.ERC20_TOKEN : TokenType.NATIVE_TOKEN,
      creatorAddress,
      creatorDID: this.didSessions.getSignedInIdentity().didString,
      expirationDate: moment().add(this.expirationDays, "days").unix(),
      visibility: this.visibility,
      probability: this.probability
    };

    // For ERC20 tokens, also save the token contract address into the packet
    if (this.tokenSubwallet instanceof ERC20SubWallet) {
      packet.erc20ContractAddress = this.tokenSubwallet.coin.getContractAddress();
    }

    // Create a new packet on the backend
    this.createdPacket = await this.packetService.createPacket(packet);
    if (!this.createdPacket) {
      // Something wrong happened, let user know
      void this.globalNativeServce.errToast(this.translate.instant("redpackets.error-packet-creation-failed"));
    }
    else {
      // Save the packet locally
      await this.packetService.addToMyPackets(this.createdPacket);

      // Reach the payment screen to continue
      await this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/pay", {
        state: {
          packetHash: this.createdPacket.hash
        }
      });
      // Remove the packet creation screen from the history
      this.globalNavService.clearIntermediateRoutes(["/redpackets/new"]);
    }

    this.creatingPacket = false;
  }

  formErr(message: string) {
    void this.globalNativeServce.errToast(message, 2000);
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
          // The token is a different one, reset the amounts to avoid mistakes
          this.tokenAmount = "";
          this.packets = null;
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

    this.unsupportedNetwork = !this.networksService.isActiveNetworkSupported();

    // Reset values that don't make sense any more after swtiching a network (need to be re-entered by user)
    this.tokenSubwallet = this.walletService.activeNetworkWallet.value.getMainEvmSubWallet();
    this.tokenAmount = "";
    this.packets = null;
  }

  useTheme(theme: RedPacketTheme) {
    this.packetTheme = theme;
  }
}
