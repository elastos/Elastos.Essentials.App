import { Component, ViewChild } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { Packet } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';

/**
 * Red packets HOMEPAGE
 */
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Logic
  public fetchingPublicPackets = true;
  public fetchingOpenedPackets = true;
  public fetchingMyPackets = true;

  // Model
  public myPackets: Packet[] = [];
  public openedPackets: Packet[] = [];
  private openedPacketsSubscriptions: Subscription;
  public publicPackets: Packet[] = [];
  private publicPacketsSubscription: Subscription;
  public walletAddress: string;

  private isIOS = false;
  public canCreateRedPacket = true;

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService,
    private translate: TranslateService,
    private walletService: WalletService,
    private prefs: GlobalPreferencesService,
    private platform: Platform
  ) {
    GlobalFirebaseService.instance.logEvent("redpackets_home_enter");
  }

  ngOnInit() {
      // For now (3.0.7 release), remove the create button on iOS as apple complains about this.
      // We can try to disable this ios check later (with changes to get rejected).
      this.isIOS = this.platform.platforms().indexOf('android') < 0;
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.red-packets"));
    this.titleBar.setBackgroundColor("#270707");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.walletAddress = this.getActiveWalletAddress();

    if (this.isIOS) {
        this.canCreateRedPacket = await this.prefs.getEnableCreatingOfRedPacket(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);
    }

    if (this.walletAddress && this.canCreateRedPacket) {
      this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
        iconPath: 'assets/redpackets/images/ic-plus.svg',
        key: 'create-packet'
      });
    }

    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      iconPath: BuiltInIcon.SETTINGS,
      key: 'settings'
    })

    this.titleBar.addOnItemClickedListener(
      this.titleBarIconClickedListener = (icon) => {
        if (icon.key == "create-packet") {
          void this.navigateToNewPacket();
        } else if (icon.key === "settings") {
          void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/settings");
        }
      });
  }

  ionViewDidEnter() {
    this.fetchingPublicPackets = true;

    this.publicPacketsSubscription = this.packetService.publicPackets.subscribe(publicPackets => {
      // todo: should this use a pagination system in the API if not already done ?
      // Slice to 4 even though we display 3 on the FE to get that view all link (>3) working.
      this.publicPackets = publicPackets.length > 3 ? publicPackets.slice(0.4) : publicPackets;
      this.fetchingPublicPackets = false;
    });

    // todo: move this to observable ?
    // todo: why is this returning packets that are not mine ?
    const myPacketsResponse = this.packetService.getMyPackets();
    this.myPackets = myPacketsResponse.length > 3 ? myPacketsResponse.slice(0, 4) : myPacketsResponse;
    console.log("my packets", this.myPackets)

    this.openedPacketsSubscriptions = this.packetService.grabbedPackets.subscribe(grabbedPackets => {
      // Note: filtering for undefined "packet" in grabbed packets - normally not needed, but legacy bug
      let openedPackets = this.packetService.getOpenedPackets();
      this.openedPackets = openedPackets.length > 3 ? openedPackets.slice(0, 4) : openedPackets;
      this.fetchingOpenedPackets = false;
    });
  }

  ionViewWillLeave() {
    if (this.openedPacketsSubscriptions) {
      this.openedPacketsSubscriptions.unsubscribe();
      this.openedPacketsSubscriptions = null;
    }
    if (this.publicPacketsSubscription) {
      this.publicPacketsSubscription.unsubscribe();
      this.publicPacketsSubscription = null;
    }
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  public navigateToNewPacket() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/new");
  }

  public navigateToPacketDetails(packet: Packet) {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/packet-details", {
      state: {
        packet: packet
      }
    });
  }

  public navigateToPublicPackets() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/public-packets");
  }

  public navigateToMyPackets() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/my-packets");
  }

  public navigateToOpenedPackets() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/opened-packets");
  }

  private getActiveWalletAddress(): string {
    if (!this.walletService.getActiveNetworkWallet() || !this.walletService.getActiveNetworkWallet().getMainEvmSubWallet())
      return null;

    return this.walletService.getActiveNetworkWallet().getMainEvmSubWallet().getCurrentReceiverAddress();
  }
}
