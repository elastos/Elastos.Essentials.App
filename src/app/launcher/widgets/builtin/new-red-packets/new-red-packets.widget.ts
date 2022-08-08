import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { App } from 'src/app/model/app.enum';
import { Packet } from 'src/app/redpackets/model/packets.model';
import { PacketService } from 'src/app/redpackets/services/packet.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';
import { WidgetsService } from '../../services/widgets.service';

@Component({
  selector: 'widget-new-red-packets',
  templateUrl: './new-red-packets.widget.html',
  styleUrls: ['./new-red-packets.widget.scss'],
})
export class NewRedPacketsWidget implements Widget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  private publicRedPacketsSubscription: Subscription = null; // Public red packets that can be grabbed
  public publicRedPackets: Packet[] = [];

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private packetService: PacketService,
    private nav: GlobalNavService,
  ) { }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsService.instance.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.publicRedPacketsSubscription = this.packetService.publicPackets.subscribe(publicPackets => {
      // Keep only the packets not grabbed by the user yet
      this.publicRedPackets = publicPackets.filter(p => !this.packetService.packetAlreadyGrabbed(p.hash));
    });
  }

  ngOnDestroy() {
    if (this.publicRedPacketsSubscription) {
      this.publicRedPacketsSubscription.unsubscribe();
      this.publicRedPacketsSubscription = null;
    }
  }

  public viewPublicRedPackets() {
    void this.nav.navigateTo(App.RED_PACKETS, "/redpackets/home");
  }
}
