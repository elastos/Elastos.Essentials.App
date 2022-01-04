import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { GrabResponse, GrabStatus } from '../../model/grab.model';
import { Packet } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';

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
  public justWon = false;
  public captchaChallengeRequired = false;

  // UI Model
  public captchaPicture: string = null;
  public captchaString = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletNetworkService: WalletNetworkService,
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

        // Refresh packet with latest data
        if (packetHash) {
          Logger.log("redpackets", "Fetching packet details for hash", packetHash);
          this.packet = await this.packetService.getPacketInfo(packetHash);
        }

        if (this.packet) {
          Logger.log("redpackets", "Showing packet details", this.packet);
          this.preparePacketDisplay();
          void this.checkIfNeedToGrab();
        }
        else {
          Logger.error("redpackets", "Unable to get packet information");
          this.packetFetchErrored = true;
        }
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Packet details");
    this.titleBar.setBackgroundColor("#f04141");
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

  private async sendInitialGrabRequest() {
    this.grabStatusChecked = false;
    this.grabResponse = await this.packetService.createGrabPacketRequest(this.packet.hash, GlobalDIDSessionsService.signedInDIDString);
    this.grabStatusChecked = true;

    await this.handleGrabResponse(this.grabResponse);
  }

  public async testCaptcha() {
    this.grabResponse = await this.packetService.createGrabCaptchaVerification(this.packet.hash, this.grabResponse, this.captchaString);
    await this.handleGrabResponse(this.grabResponse);
  }

  private async handleGrabResponse(grabResponse: GrabResponse) {
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
        // TODO: Winning!
        this.justWon = true;
      }
      else if (grabResponse.status === GrabStatus.MISSED) {
        // TODO: Lost
      }
      else if (grabResponse.status === GrabStatus.DEPLETED) {
        // TODO: No more packets
      }
    }
  }
}
