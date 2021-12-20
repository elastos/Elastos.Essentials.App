import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public onItemClickedListener: any;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    public packetService: PacketService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Res Packets");
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  public newPacket() {
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/new");
  }
}
