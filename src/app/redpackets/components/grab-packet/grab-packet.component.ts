import { Component, ElementRef, EventEmitter, Input, ViewChild } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { TitleBarComponent } from "../../../components/titlebar/titlebar.component";
import { GlobalDIDSessionsService } from "../../../services/global.didsessions.service";
import { GlobalNativeService } from "../../../services/global.native.service";
import { GrabResponse, GrabStatus } from "../../model/grab.model";
import { Packet } from "../../model/packets.model";
import { DIDService } from "../../services/did.service";
import { PacketService } from "../../services/packet.service";

@Component({
    selector: 'grab-packet',
    templateUrl: './grab-packet.component.html',
    styleUrls: ['./grab-packet.component.scss'],
})
export class GrabPacketComponent {
    @ViewChild("icon") iconElement: ElementRef;
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    @Input() packet: Packet;
    @Input() grabEventEmitter: EventEmitter<GrabStatus>; // todo: Not sure this is the right thing to do for event handling with ionic - ask Ben
    @Input() walletAddress: string;

    public captchaPicture: string;
    public captchaString = "";
    public captchaError = false;
    public fetchingGrabData = false;
    private grabResponse: GrabResponse;

    constructor(
        private popoverController: PopoverController,
        private globalNativeServce: GlobalNativeService,
        private translate: TranslateService,
        private packetService: PacketService,
        private didService: DIDService,
    ) { }

    ionViewWillEnter() {
        void this.sendGrabRequest();
    }

    private async sendGrabRequest() {
        this.fetchingGrabData = true;
        this.grabResponse = await this.packetService.createGrabPacketRequest(this.packet, this.walletAddress);
        this.fetchingGrabData = false;

        await this.handleGrabResponse(this.grabResponse);
    }

    public async testCaptcha() {
        if (this.grabResponse && !this.captchaString) {
            void this.globalNativeServce.errToast(this.translate.instant("redpackets.error-captcha-is-required"), 2000);
            return false;
        }
        this.fetchingGrabData = true;
        this.grabResponse = await this.packetService.createGrabCaptchaVerification(
            this.packet,
            this.grabResponse,
            this.captchaString,
            this.walletAddress,
            // Send grabber DID only if allowed in settings
            this.didService.getProfileVisibility() ? GlobalDIDSessionsService.signedInDIDString : undefined
        );
        this.fetchingGrabData = false;
        await this.handleGrabResponse(this.grabResponse);
    }

    private async handleGrabResponse(grabResponse: GrabResponse) {
        if (grabResponse) {
            if (grabResponse.status == GrabStatus.CAPTCHA_CHALLENGE) {
                // User needs to complete the captcha challenge to finalize the grab verification
                this.captchaPicture = "data:image/svg+xml;base64," + Buffer.from(grabResponse.captchaPicture).toString("base64");
            } else if (grabResponse.status === GrabStatus.WRONG_CAPTCHA) {
                // Empty the text input to retry
                this.captchaString = "";
                // Wrong capcha: send a new grab request to get a new captcha
                await this.sendGrabRequest();
                void this.globalNativeServce.errToast(this.translate.instant("redpackets.wrong-captcha"), 2000);
                this.captchaError = true;
            } else if (grabResponse.status === GrabStatus.GRABBED) {
                void this.globalNativeServce.genericToast(this.translate.instant("redpackets.got-it"), 2000);
                this.grabEventEmitter.emit(GrabStatus.GRABBED)
                void this.closeModal();
            } else if (grabResponse.status === GrabStatus.MISSED) {
                void this.globalNativeServce.genericToast(this.translate.instant("redpackets.missed"), 2000);
                this.grabEventEmitter.emit(GrabStatus.MISSED)
                void this.closeModal();
            } else if (grabResponse.status === GrabStatus.DEPLETED) {
                void this.globalNativeServce.genericToast(this.translate.instant("redpackets.depleted"), 2000);
                this.grabEventEmitter.emit(GrabStatus.DEPLETED)
                void this.closeModal();
            }
            else if (grabResponse.status === GrabStatus.TOO_MANY_REQUEST) {
                void this.globalNativeServce.genericToast(this.translate.instant("redpackets.ip-rate-limitation"), 2000);
                this.grabEventEmitter.emit(GrabStatus.TOO_MANY_REQUEST)
                void this.closeModal();
            }
        }
        else {
            // Unexpected error (such as already grabbed recently) - close the modal, user will have to try again later.
            void this.closeModal();
        }
    }

    async closeModal() {
        const close = "Modal Removed";
        await this.popoverController.dismiss(close);
    }
}
