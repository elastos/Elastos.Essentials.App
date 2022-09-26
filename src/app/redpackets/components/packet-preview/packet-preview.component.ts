import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UiService } from 'src/app/wallet/services/ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { GrabStatus } from '../../model/grab.model';
import { Packet, TokenType } from '../../model/packets.model';
import { DIDService } from '../../services/did.service';
import { PacketService } from '../../services/packet.service';

@Component({
    selector: 'packet-preview',
    templateUrl: './packet-preview.component.html',
    styleUrls: ['./packet-preview.component.scss'],
})
export class PacketPreviewComponent implements OnInit, OnDestroy {
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
    private activeWalletAddress: string;

    // UI Model
    public creator = ""; // Packet creator's name
    public wonAmount: string; // Won amount, human readable
    public wonSymbol: string; // Token symbol, if packet was grabbed (won)
    public packetWasOpened = false;
    public walletWonThePacket = false;

    // Subscriptions
    private grabbedPacketsSubscription: Subscription = null;

    constructor(
        public theme: GlobalThemeService,
        protected popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private didService: DIDService,
        private uiService: UiService,
        private walletService: WalletService,
        public packetService: PacketService
    ) { }

    async ngOnInit() {
        if (this.walletService.getActiveNetworkWallet() && this.walletService.getActiveNetworkWallet().getMainEvmSubWallet())
            this.activeWalletAddress = await this.walletService.getActiveNetworkWallet().getMainEvmSubWallet().getCurrentReceiverAddress();

        this.grabbedPacketsSubscription = this.packetService.grabbedPackets.subscribe(grabbedPackets => {
            this.updatePacketStatus();
        });
    }

    ngOnDestroy() {
        if (this.grabbedPacketsSubscription)
            this.grabbedPacketsSubscription.unsubscribe();
    }

    private preparePacket(packet: Packet) {
        if (packet) {
            this.updatePacketStatus();
            this.didService.fetchUserInformation(packet.creatorDID).subscribe(userInfo => {
                this.creator = userInfo && userInfo.name ? userInfo.name : GlobalTranslationService.instance.translateInstant("redpackets.anonymous");
            });
        }
    }

    public activeWalletIsCreator(): boolean {
        if (!this._packet)
            return false;

        return this._packet.creatorAddress === this.activeWalletAddress;
    }

    public onClicked() {
        this.clicked.emit();
    }

    private updatePacketStatus() {
        // Won or not?
        let grabbedPacket = this.packetService.getGrabbedPacket(this._packet.hash);
        if (!grabbedPacket) {
            // Never opened
            this.packetWasOpened = false;
            this.walletWonThePacket = false;
        }
        else {
            this.packetWasOpened = true;
            this.walletWonThePacket = grabbedPacket.status === GrabStatus.GRABBED;
            this.wonAmount = this.wonSymbol = this.uiService.getFixedBalance(new BigNumber(grabbedPacket.earnedAmount));
            if (this._packet.tokenType === TokenType.NATIVE_TOKEN)
                this.wonSymbol = grabbedPacket.packet.nativeTokenSymbol;
            else
                this.wonSymbol = grabbedPacket.packet.erc20TokenSymbol;
        }
    }

    public getPacketMessage(packet: Packet): string {
        if (packet.message.length > 60)
            return packet.message.substring(0, 60) + "...";
        else
            return packet.message;
    }
}
