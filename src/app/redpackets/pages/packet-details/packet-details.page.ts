import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { GrabResponse, GrabStatus, PacketWinner } from '../../model/grab.model';
import { Packet, TokenType } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';
import { PacketService } from '../../services/packet.service';

type WinnerDisplayEntry = {
  winner: PacketWinner;
  name: string;
  avatarUrl: string;
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
  public fetchingWinners = false;
  public fetchingPacket = false;
  public justWon = false;
  public justMissed = false;
  public justNoMorePackets = false;
  public captchaChallengeRequired = false;
  public packetIsInactive = false; // Whether the packet is live for everyone or not (paid)

  // UI Model
  public captchaPicture: string = null;
  public captchaString = "";
  public winners: WinnerDisplayEntry[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletNetworkService: WalletNetworkService,
    private walletService: WalletService,
    private didService: DIDService,
    private uiService: UiService,
    private globalNavService: GlobalNavService,
    public packetService: PacketService
  ) {

  }

  ngOnInit() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.route.queryParams.subscribe(async params => {
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
          }
        }
        else {
          Logger.error("redpackets", "Unable to get packet information for packet hash " + packetHash);
          this.packetFetchErrored = true;
        }
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Packet details");
    this.titleBar.setBackgroundColor("#701919");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewDidEnter() {
  }

  private preparePacketDisplay() {
    this.network = this.walletNetworkService.getNetworkByChainId(this.packet.chainId);
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
    return this.walletService.getActiveNetworkWallet().getMainEvmSubWallet().createAddress();
  }

  private async sendInitialGrabRequest() {
    let walletAddress = await this.getActiveWalletAddress();

    this.grabStatusChecked = false;
    this.captchaString = "";
    this.grabResponse = await this.packetService.createGrabPacketRequest(this.packet.hash, walletAddress);
    this.grabStatusChecked = true;

    await this.handleGrabResponse(this.grabResponse);
  }

  public async testCaptcha() {
    let walletAddress = await this.getActiveWalletAddress();
    this.grabResponse = await this.packetService.createGrabCaptchaVerification(
      this.packet,
      this.grabResponse,
      this.captchaString,
      walletAddress,
      GlobalDIDSessionsService.signedInDIDString);
    await this.handleGrabResponse(this.grabResponse);
  }

  private async handleGrabResponse(grabResponse: GrabResponse) {
    this.captchaChallengeRequired = false;
    this.justWon = false;
    this.justMissed = false;
    this.justNoMorePackets = false;

    if (grabResponse) {
      if (grabResponse.status == GrabStatus.CAPTCHA_CHALLENGE) {
        // User needs to complete the captcha challenge to finalize the grab verification
        this.captchaChallengeRequired = true;
        this.captchaPicture = "data:image/svg+xml;base64," + Buffer.from(grabResponse.captchaPicture).toString("base64");
      }
      else if (grabResponse.status === GrabStatus.WRONG_CAPTCHA) {
        // Wrong capcha: send a new grab request to get a new captcha
        await this.sendInitialGrabRequest();
      }
      else if (grabResponse.status === GrabStatus.GRABBED) {
        this.justWon = true;
        // Update winners list (with ourself, mostly)
        void this.fetchWinners();
      }
      else if (grabResponse.status === GrabStatus.MISSED) {
        this.justMissed = true;
      }
      else if (grabResponse.status === GrabStatus.DEPLETED) {
        this.justNoMorePackets = true;
      }
    }
  }

  public getEarnedAmount(): string {
    return new BigNumber(this.grabResponse.earnedAmount).toFixed(5);
  }

  public getEarnedTokenSymbol(): string {
    if (this.packet.tokenType === TokenType.NATIVE_TOKEN)
      return this.packet.nativeTokenSymbol;
    else
      return this.packet.erc20TokenSymbol;
  }

  private async fetchWinners() {
    this.fetchingWinners = true;
    let rawWinners = await this.packetService.getPacketWinners(this.packet.hash);
    this.fetchingWinners = false;

    // For each winner, get DID information if any. During this time, we may display placeholders
    // and then show avatar and real DID names as they arrive asynchronously
    for (let winner of rawWinners) {
      let winnerEntry: WinnerDisplayEntry = {
        winner,
        name: "",
        avatarUrl: transparentPixelIconDataUrl() // TMP - use placeholder avatar picture
      }
      this.winners.push(winnerEntry);

      if (winner.userDID) {
        // Async
        void this.didService.fetchUserInformation(winner.userDID).then(userInfo => {
          console.log("userInfo", userInfo)
          if (userInfo) {
            if (userInfo.name)
              winnerEntry.name = userInfo.name;

            if (userInfo.avatarDataUrl)
              winnerEntry.avatarUrl = userInfo.avatarDataUrl;
          }
        });
      }
    }
  }

  public userIsCreator(): boolean {
    return this.packet.userIsCreator(GlobalDIDSessionsService.signedInDIDString);
  }

  public finalizePayment() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/pay", {
      state: {
        packetHash: this.packet.hash
      }
    });
  }

  public getWinnerAmount(winner: WinnerDisplayEntry): string {
    return this.uiService.getFixedBalance(new BigNumber(winner.winner.winningAmount));
  }
}
