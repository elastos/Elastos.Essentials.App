import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
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

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService,
    private translate: TranslateService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.red-packets"));
    this.titleBar.setBackgroundColor("#701919");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
      iconPath: 'assets/redpackets/images/ic-plus.svg',
      key: 'create-packet'
    })

    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      iconPath: 'assets/redpackets/images/settings.svg',
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
      this.publicPackets = publicPackets.length > 3 ? publicPackets.slice(0.3) : publicPackets;
      this.fetchingPublicPackets = false;
    });

    // todo: move this to observable ?
    // todo: why is this returning packets that are not mine ?
    const myPacketsResponse = this.packetService.getMyPackets();
    this.myPackets = myPacketsResponse.length > 3 ? myPacketsResponse.slice(0, 3) : myPacketsResponse;

    this.openedPacketsSubscriptions = this.packetService.openedPackets.subscribe(openedPackets => {
      this.openedPackets = openedPackets.length > 3 ? openedPackets.slice(0, 3) : openedPackets;
      this.fetchingOpenedPackets = false;
    });
  }

  ionViewWillLeave() {
    this.openedPacketsSubscriptions.unsubscribe();
    this.publicPacketsSubscription.unsubscribe();
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
}
