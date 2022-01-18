import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Packet } from "../../model/packets.model";
import { GrabResponse, GrabStatus } from "../../model/grab.model";
import { PacketService } from "../../services/packet.service";
import { GlobalDIDSessionsService } from "../../../services/global.didsessions.service";
import { DIDService } from "../../services/did.service";
import { TitleBarComponent } from "../../../components/titlebar/titlebar.component";
import { GlobalNativeService } from "../../../services/global.native.service";
import { TranslateService } from "@ngx-translate/core";

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
    private grabResponse: GrabResponse;

    constructor(
      private modalController: ModalController,
      private globalNativeServce: GlobalNativeService,
      private translate: TranslateService,
      private packetService: PacketService,
      private didService: DIDService,
    ) { }

    ionViewWillEnter() {
        void this.sendGrabRequest();
    }

    private async sendGrabRequest() {
        this.grabResponse = await this.packetService.createGrabPacketRequest(this.packet.hash, this.walletAddress);

        await this.handleGrabResponse(this.grabResponse);
    }

    public async testCaptcha() {
        if (this.grabResponse && !this.captchaString) {
            void this.globalNativeServce.errToast(this.translate.instant("redpackets.error-captcha-is-required"), 2000);
            return false;
        }
        this.grabResponse = await this.packetService.createGrabCaptchaVerification(
          this.packet,
          this.grabResponse,
          this.captchaString,
          this.walletAddress,
          // Send grabber DID only if allowed in settings
          this.didService.getProfileVisibility() ? GlobalDIDSessionsService.signedInDIDString : undefined
        );
        await this.handleGrabResponse(this.grabResponse);
    }

    private async handleGrabResponse(grabResponse: GrabResponse) {
        if (grabResponse) {
            if (grabResponse.status == GrabStatus.CAPTCHA_CHALLENGE) {
                // User needs to complete the captcha challenge to finalize the grab verification
                this.captchaPicture = "data:image/svg+xml;base64," + Buffer.from(grabResponse.captchaPicture).toString("base64");
            } else if (grabResponse.status === GrabStatus.WRONG_CAPTCHA) {
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
        }
    }

    async closeModal() {
        const close: string = "Modal Removed";
        await this.modalController.dismiss(close);
    }
}
