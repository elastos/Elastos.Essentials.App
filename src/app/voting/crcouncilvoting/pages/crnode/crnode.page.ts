import { Component, OnInit, ViewChild } from '@angular/core';
import { CRCouncilMemberClaimNodeInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { CRCouncilService } from '../../services/crcouncil.service';


@Component({
    selector: 'app-crnode',
    templateUrl: './crnode.page.html',
    styleUrls: ['./crnode.page.scss'],
})
export class CRNodePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public nodePublicKey: string = null;
    public oldPublicKey: string = null;
    public did: string = null;
    public label = '';

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        public popupProvider: PopupProvider,
        public crCouncilService: CRCouncilService,
        private globalNative: GlobalNativeService,
    ) {

    }

    ngOnInit() {
        Logger.log("CRNodePage", "ngOnInit")
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.claim-dpos-node'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);

        if (!this.oldPublicKey || this.oldPublicKey == "" || !this.did) {
            if (this.crCouncilService.isElected) {
                this.oldPublicKey = this.crCouncilService.nextCRInfo.dpospublickey;
                this.did = this.crCouncilService.nextCRInfo.did;
            }

            if ((!this.oldPublicKey || this.oldPublicKey == "") && this.crCouncilService.isCRMember) {
                this.oldPublicKey = this.crCouncilService.crmemberInfo.dpospublickey;
                this.did = this.crCouncilService.crmemberInfo.did;
            }
            this.nodePublicKey = this.oldPublicKey;
        }

        if (!this.nodePublicKey || this.nodePublicKey == "") {
            this.label = this.translate.instant('crcouncilvoting.enter-node-publickey');
        }
        else {
            this.label = this.translate.instant('crcouncilvoting.edit-node-publickey');
        }
    }

    checkValues(): boolean {
        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');

        if (!this.nodePublicKey || this.nodePublicKey == "") {
            blankMsg = this.translate.instant('dposregistration.node-publickey') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return false;
        }

        if (!this.nodePublicKey.match("^[A-Fa-f0-9]+$") || this.nodePublicKey.length != 66
            || !(this.nodePublicKey.startsWith("02") || this.nodePublicKey.startsWith("03"))) {
            formatWrong = this.translate.instant('dposregistration.node-publickey') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return false;
        }

        if (!this.crCouncilService.isElected && this.nodePublicKey == this.oldPublicKey) {
            this.globalNative.genericToast('crcouncilvoting.text-public-key-dont-modify');
            return false;
        }

        return true;
    }

    async goTransaction() {
        if (!this.checkValues()) {
            return;
        }

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        try {
            //Get payload
            var payload = {
                NodePublicKey: this.nodePublicKey,
                CRCouncilMemberDID: this.did,
            } as CRCouncilMemberClaimNodeInfo;
            Logger.log('crproposal', "Got review proposal payload.", payload);

            //Get digest
            let version = 0;
            if (this.crCouncilService.inClaiming && this.crCouncilService.isElected) {
                version = 1;
            }

            var digest = await this.voteService.sourceSubwallet.CRCouncilMemberClaimNodeDigest(payload, version);
            Logger.log('crproposal', "Got review proposal digest.", digest);

            let signature = await this.crCouncilService.getSignature(digest);
            if (signature) {
                payload.CRCouncilMemberSignature = signature;

                await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

                //Create transaction and send
                const rawTx = await this.voteService.sourceSubwallet.createCRCouncilMemberClaimNodeTransaction(version, payload, '');
                await this.globalNative.hideLoading();

                let ret = await this.voteService.signAndSendRawTransaction(rawTx);
                if (ret) {
                    this.voteService.toastSuccessfully('crcouncilvoting.claim-dpos-node');
                }
            }
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }
    }
}
