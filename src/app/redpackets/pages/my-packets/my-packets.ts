import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'page-my-packets',
  templateUrl: 'my-packets.html',
  styleUrls: ['./my-packets.scss'],
})
export class MyPacketsPage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("My Packets");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewWillLeave() {
  }
}
