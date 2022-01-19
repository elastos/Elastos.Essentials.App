import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Packet } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';
import { PacketService } from '../../services/packet.service';

@Component({
    selector: 'packet-preview',
    templateUrl: './packet-preview.component.html',
    styleUrls: ['./packet-preview.component.scss'],
})
export class PacketPreviewComponent {
    @ViewChild("icon") iconElement: ElementRef;

    @Input()
    set packet(packet: Packet) {
        this._packet = packet;
        void this.preparePacket(packet);
    }

    @Output("onClicked")
    private clicked?= new EventEmitter();

    @Output("checkBoxClicked")
    private checkBoxClicked?= new EventEmitter();

    // Model
    public _packet: Packet = null;

    // UI Model
    public creator = ""; // Packet creator's name

    constructor(
        public theme: GlobalThemeService,
        protected popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private didService: DIDService,
        public packetService: PacketService
    ) { }

    ionViewWillEnter() {
    }

    private preparePacket(packet: Packet) {
        if (packet) {
            this.didService.fetchUserInformation(packet.creatorDID).subscribe(userInfo => {
                this.creator = userInfo && userInfo.name ? userInfo.name : packet.creatorDID.slice(0, 20) + "...";
            });
        }
    }

    public onClicked() {
        this.clicked.emit();
    }
}
