import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'page-opened-packets',
  templateUrl: 'opened-packets.html',
  styleUrls: ['./opened-packets.scss'],
})
export class OpenedPacketsPage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Opened Packets");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewWillLeave() {
  }
}
