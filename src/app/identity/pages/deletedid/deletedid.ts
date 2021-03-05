import { Component, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { AdvancedPopupController } from '../../components/advanced-popup/advancedpopup.controller';
import { Profile } from '../../model/profile.model';
import { UXService } from '../../services/ux.service';
import { DIDService } from '../../services/did.service';
import { Config } from '../../services/config';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { IntentReceiverService } from '../../services/intentreceiver.service';

@Component({
    selector: 'page-deletedid',
    templateUrl: 'deletedid.html',
    styleUrls: ['deletedid.scss']
})
export class DeleteDIDPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public didString: string = "";
    public profile: Profile;

    constructor(public route: ActivatedRoute,
                public zone: NgZone,
                private advancedPopup: AdvancedPopupController,
                private translate: TranslateService,
                private didService: DIDService,
                private uxService: UXService,
                private intentService: IntentReceiverService
                ) {
        this.init();
    }

    init() {
        this.profile = this.didService.getActiveDid().getBasicProfile();
        this.didString = this.didService.getActiveDid().getDIDString();
    }

    ionViewWillEnter() {
        this.uxService.makeAppVisible();

        this.titleBar.setTitle(this.translate.instant('delete-did'));
        this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    }

    /**
     * Permanently delete the DID after user confirmation.
     */
    deleteDID() {
        this.advancedPopup.create({
            color: '#FF4D4D',
            info: {
                picture: '/assets/images/Local_Data_Delete_Icon.svg',
                title: this.translate.instant("deletion-popup-warning"),
                content: this.translate.instant("deletion-popup-content")
            },
            prompt: {
                title: this.translate.instant("deletion-popup-confirm-question"),
                confirmAction: this.translate.instant("confirm"),
                cancelAction: this.translate.instant("go-back"),
                confirmCallback: async () => {
                    console.log("Deletion confirmed by user");
                    let activeDid = this.didService.getActiveDid();
                    await this.didService.deleteDid(activeDid);

                    // DID has been deleted. Now go back to the calling app (normally, DID session)
                    console.log("Identity has been deleted. Sending intent response");
                    await this.uxService.sendIntentResponse("deletedid", {
                        didString: this.didString
                    }, this.intentService.getReceivedIntent().intentId);
                }
            }
        }).show();
    }
}
