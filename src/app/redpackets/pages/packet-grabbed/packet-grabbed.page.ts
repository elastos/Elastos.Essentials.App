import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { PacketDetail } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'app-packet-grabbed',
  templateUrl: './packet-grabbed.page.html',
  styleUrls: ['./packet-grabbed.page.scss'],
})
export class PacketGrabbedPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public packet: PacketDetail;
  public ela = 0;

  constructor(
    private route: ActivatedRoute,
    public packetService: PacketService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params) {
        this.packet = JSON.parse(params.packet);
        this.ela = params.ela;
        console.log('Packet', this.packet);
        console.log('ELA Claimed', this.ela);
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Congrats!");
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewDidEnter() {
  }
}
