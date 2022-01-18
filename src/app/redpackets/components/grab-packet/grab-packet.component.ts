import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ModalController, PopoverController } from "@ionic/angular";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Packet } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';

@Component({
    selector: 'grab-packet',
    templateUrl: './grab-packet.component.html',
    styleUrls: ['./grab-packet.component.scss'],
})
export class GrabPacketComponent {
    @ViewChild("icon") iconElement: ElementRef;
    @Input() packet: Packet;

    constructor(
      private modalController: ModalController,
    ) { }

    ionViewWillEnter() {
    }

    async closeModel() {
        const close: string = "Modal Removed";
        await this.modalController.dismiss(close);
    }

}
