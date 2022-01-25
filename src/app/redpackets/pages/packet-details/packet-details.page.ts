import { Component, EventEmitter, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { PopoverController } from "@ionic/angular";
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from "moment";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { environment } from "src/environments/environment";
import { GrabPacketComponent } from "../../components/grab-packet/grab-packet.component";
import { GrabResponse, GrabStatus, PacketWinner } from '../../model/grab.model';
import { Packet, PacketDistributionType, TokenType } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';
import { PacketService } from '../../services/packet.service';
import { ThemeService } from '../../services/theme.service';

type WinnerDisplayEntry = {
  winner: PacketWinner;
  name: string;
  avatarUrl: string;
  date: string;
  time: string;
}

@Component({
  selector: 'app-packet-details',
  templateUrl: './packet-details.page.html',
  styleUrls: ['./packet-details.page.scss'],
})
export class PacketDetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public packet: Packet;
  public network: Network = null;
  private grabResponse: GrabResponse = null;

  // UI Logic
  public packetFetchErrored = false; // Error while fetching a remote packet info (network, not found...)
  public checkingGrabStatus = false; // Checking if the packet can be grabbed with the service
  public grabStatusChecked = false; // Grab status has been checked, we know if we won or not
  public fetchingCreator = false;
  public fetchingWinners = false;
  public fetchingPacket = false;
  public justWon = false;
  public justMissed = false;
  public justNoMorePackets = false;
  public captchaChallengeRequired = false;
  public packetIsInactive = false; // Whether the packet is live for everyone or not (paid)
  private walletAddress: string;

  // UI Model
  public winners: WinnerDisplayEntry[] = [];
  public creatorAvatar: string = null;
  public creatorName: string = null;
  public activeWalletAsWinner: WinnerDisplayEntry = null; // If active wallet is a winner, the winner entry

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletNetworkService: WalletNetworkService,
    private walletService: WalletService,
    private didService: DIDService,
    private uiService: UiService,
    private globalNavService: GlobalNavService,
    private globalNativeService: GlobalNativeService,
    public packetService: PacketService,
    public popoverController: PopoverController,
    private themeService: ThemeService,
    private translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private clipboard: Clipboard
  ) {

  }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        let state = this.router.getCurrentNavigation().extras.state as { packet?: Packet; packetHash?: string };

        // We can arrive here either with a packet hash (ie: from a grab intent) or from an already
        // existing packet info (ie: from another redpacket screen).
        // We first display the cached packet info (state.packet) but at the same time we get
        // fresh packet info (in case we are coming back to see the people who grabbed the packet, etc.)
        // The cached packet is mostly to display packets in list.

        let packetHash: string = null;
        if (state.packet) {
          // We already have a packet, use this
          this.packet = state.packet;
          packetHash = state.packet.hash;
        }
        else {
          packetHash = state.packetHash;
        }

        // Don't block the UI
        void (async () => {
          this.walletAddress = await this.getActiveWalletAddress();

          // Refresh packet with latest data
          if (packetHash) {
            Logger.log("redpackets", "Fetching packet details for hash", packetHash);
            this.fetchingPacket = true;
            this.packet = await this.packetService.getPacketInfo(packetHash);
            this.fetchingPacket = false;
          }

          if (this.packet) {
            Logger.log("redpackets", "Showing packet details", this.packet);
            this.preparePacketDisplay();

            // Only try to grab / get winners if the packet is live
            if (this.packet.isActive) {
              // TMP DEBUG if (!this.packet.userIsCreator(GlobalDIDSessionsService.signedInDIDString))
              void this.checkIfNeedToGrab();
              void this.fetchWinners();
            }
            else {
              this.packetIsInactive = true;
              this.grabStatusChecked = true; // Consider as checked because nothing to check yet
            }
          }
          else {
            Logger.error("redpackets", "Unable to get packet information for packet hash " + packetHash);
            this.packetFetchErrored = true;
          }
        })();
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.red-packet"));
    this.titleBar.setBackgroundColor("#701919");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewDidEnter() {
  }

  private preparePacketDisplay() {
    this.network = this.walletNetworkService.getNetworkByChainId(this.packet.chainId);

    void this.fetchCreatorInformation();
  }

  /**
   * Get avatar and name from the creator DID, if any
   */
  private fetchCreatorInformation() {
    this.fetchingCreator = true;
    if (this.packet.creatorDID) {
      this.didService.fetchUserInformation(this.packet.creatorDID).subscribe(userInfo => {
        if (userInfo) {
          if (userInfo.name)
            this.creatorName = userInfo.name;

          if (userInfo.avatarDataUrl)
            this.creatorAvatar = userInfo.avatarDataUrl;
        }
      });
    }
    this.fetchingCreator = false;
  }

  /**
   * Checks if this packet was already grabbed by current user (DID) or not.
   * If not, try to grab the packet.
   */
  private async checkIfNeedToGrab(): Promise<void> {
    if (this.packetService.packetAlreadyGrabbed(this.packet.hash)) {
      this.grabStatusChecked = true;
      return;
    }

    // Packet not grabbed, try to grab it
    await this.sendInitialGrabRequest();
  }

  private getActiveWalletAddress(): Promise<string> {
    if (!this.walletService.getActiveNetworkWallet() || !this.walletService.getActiveNetworkWallet().getMainEvmSubWallet())
      return null;

    return this.walletService.getActiveNetworkWallet().getMainEvmSubWallet().createAddress();
  }

  private async sendInitialGrabRequest() {
    this.grabStatusChecked = false;
    this.grabResponse = await this.packetService.createGrabPacketRequest(this.packet, this.walletAddress);

    if (this.grabResponse && this.grabResponse.status == GrabStatus.CAPTCHA_CHALLENGE) {
      // User needs to complete the captcha challenge to finalize the grab verification
      this.captchaChallengeRequired = true;
    }

    this.grabStatusChecked = true;
  }

  public getEarnedAmount(): string {
    return this.getWinnerAmount(this.activeWalletAsWinner);
  }

  public getWinnerAmount(winner: WinnerDisplayEntry): string {
    return this.uiService.getFixedBalance(new BigNumber(winner.winner.winningAmount));
  }

  public getEarnedTokenSymbol(): string {
    if (this.packet.tokenType === TokenType.NATIVE_TOKEN)
      return this.packet.nativeTokenSymbol;
    else
      return this.packet.erc20TokenSymbol;
  }

  public isActiveWalletAWinner(): boolean {
    return this.grabStatusChecked && !!this.activeWalletAsWinner;
  }

  public isActiveWalletALoser(): boolean {
    return this.grabStatusChecked && !this.activeWalletAsWinner;
  }

  public getDisplayableDistribution(): string {
    switch (this.packet.distributionType) {
      case PacketDistributionType.RANDOM:
        return this.translate.instant("redpackets.random");
      case PacketDistributionType.FIXED:
        return this.translate.instant("redpackets.fixed-amounts");
      default:
        return (this.packet.distributionType as any).toString();
    }
  }

  /**
   * Background theme image at the top
   */
  public getThemeBackgroundImage(): string {
    let theme = this.themeService.getThemeByKey(this.packet.category);
    if (!theme)
      theme = this.themeService.getDefaultTheme();

    return `url(${theme.fullImage})`;
  }

  private async fetchWinners() {
    this.fetchingWinners = true;
    let rawWinners: PacketWinner[] = await this.packetService.getPacketWinners(this.packet.hash);
    // Winners are already sorted by most recent first by the backend.
    this.fetchingWinners = false;

    // For each winner, get DID information if any. During this time, we may display placeholders
    // and then show avatar and real DID names as they arrive asynchronously
    this.winners = [];
    for (let winner of rawWinners) {
      let winnerEntry: WinnerDisplayEntry = {
        winner,
        name: "",
        avatarUrl: null, // TMP - use placeholder avatar picture
        date: moment.unix(winner.creationDate).format('MMM D, YYYY'),
        time: moment.unix(winner.creationDate).format('HH:mm:ss')
      }
      this.winners.push(winnerEntry); // todo: Limit the number here to only have 3 winners ?

      if (winner.userDID) {
        // Async
        this.didService.fetchUserInformation(winner.userDID).subscribe(userInfo => {
          if (userInfo) {
            //console.log("Got winner user info", userInfo);
            if (userInfo.name)
              winnerEntry.name = userInfo.name;

            if (userInfo.avatarDataUrl)
              winnerEntry.avatarUrl = userInfo.avatarDataUrl;
          }
        });
      }
    }

    // Now that we have a fresh winners list,
    this.checkActiveWalletAsWinner();
  }

  public getDisplayableWinnerName(winner: WinnerDisplayEntry) {
    if (winner.name)
      return winner.name; // Ideally we got a real name from the DID document, show it
    else
      return this.translate.instant("redpackets.anonymous"); // Worst case - no info at all - show anonymous
  }

  public userIsCreator(): boolean {
    return this.packet.userIsCreator(GlobalDIDSessionsService.signedInDIDString);
  }

  public activeWalletIsCreator(): boolean {
    return this.packet.creatorAddress === this.walletAddress;
  }

  /**
   * If the active wallet is a winner, updates the active user as winner entry.
   */
  public checkActiveWalletAsWinner() {
    this.activeWalletAsWinner = this.winners.find(w => w.winner.walletAddress === this.walletAddress);
  }

  public finalizePayment() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/pay", {
      state: {
        packetHash: this.packet.hash
      }
    });
  }

  async openGrabModal() {
    const eventEmitter = new EventEmitter<GrabStatus>();
    eventEmitter.subscribe(grabStatus => {
      if (grabStatus === GrabStatus.GRABBED) {
        this.justWon = true;
      } else if (grabStatus === GrabStatus.MISSED) {
        this.justMissed = true;
      } else if (grabStatus === GrabStatus.DEPLETED) {
        this.justNoMorePackets = true;
      }

      this.captchaChallengeRequired = false;

      // Update winners list
      void this.fetchWinners();
    });

    const modal = await this.popoverController.create({
      component: GrabPacketComponent,
      mode: 'ios',
      cssClass: 'grab-packet-popover-component',
      translucent: true,
      componentProps: {
        packet: this.packet,
        grabEventEmitter: eventEmitter,
        walletAddress: this.walletAddress
      }
    });

    return await modal.present()
  }

  public getPacketUrl(): string {
    return `${environment.RedPackets.webUrl}/p?g=${this.packet.hash}`;
  }

  public copyPacketLink() {
    void this.clipboard.copy(this.getPacketUrl());
    void this.globalNativeService.genericToast(this.translate.instant("redpackets.packet-url-copied"));
  }

  public sharePacketLink() {
    void this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("redpackets.packet-share-title"),
      url: this.getPacketUrl()
    });
  }

  /**
   * Tells if the active packet was created on a main network (mainnet) or not.
   */
  public packetOnAMainNetwork(): boolean {
    if (!this.packet || !this.network)
      return false;

    return this.network.networkTemplate === MAINNET_TEMPLATE;
  }
}
