import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { IdentityAvatar } from 'src/app/model/didsessions/identityavatar';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalDIDSessionsService } from "../../../services/global.didsessions.service";
import { Packet } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';
import { PacketService } from '../../services/packet.service';

/**
 * todo redpacket
 * - Profile visibility
 * - Profile binding
 */
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsPage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Model
  public packets: Packet[] = [];
  public userName = "";
  public userDID = "";
  public userAvatar: IdentityAvatar;
  public isProfileVisibible = false;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private didSessions: GlobalDIDSessionsService,
    public packetService: PacketService,
    private translate: TranslateService,
    private didService: DIDService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("redpackets.settings-title"));
    this.titleBar.setBackgroundColor("#270707");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);

    this.userName = this.didSessions.getSignedInIdentity().name;
    this.userDID = this.didSessions.getSignedInIdentity().didString;
    this.userAvatar = this.didSessions.getSignedInIdentity().avatar;
    this.packets = this.packetService.getMyPackets();
    this.isProfileVisibible = this.didService.getProfileVisibility();
  }

  ionViewWillLeave() {
  }

  public openPacketDetails(packet: Packet) {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/packet-details", {
      state: {
        packet: packet
      }
    });
  }

  public visibilityChanged() {
    void this.didService.setProfileVisibility(this.isProfileVisibible);
  }
}
