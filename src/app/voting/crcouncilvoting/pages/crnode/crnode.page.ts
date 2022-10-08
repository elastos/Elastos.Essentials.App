import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
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
    public crmemberInfo: any = {};

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletService,
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
        this.crmemberInfo = this.crCouncilService.selectedMember;
        if (!this.nodePublicKey) {
            this.nodePublicKey = this.crmemberInfo.dpospublickey;
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

        if (this.nodePublicKey == this.crmemberInfo.dpospublickey) {
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
                CRCouncilMemberDID: this.crmemberInfo.did,
            } as any;
            Logger.log('crproposal', "Got review proposal payload.", payload);

            //Get digest
            var digest = await this.voteService.sourceSubwallet.CRCouncilMemberClaimNodeDigest(payload);
            Logger.log('crproposal', "Got review proposal digest.", digest);

            let signature = await this.crCouncilService.getSignature(digest);
            if (signature) {
                payload.CRCouncilMemberSignature = signature;

                await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

                //Create transaction and send
                const rawTx = await this.voteService.sourceSubwallet.createCRCouncilMemberClaimNodeTransaction(payload, '');
                await this.globalNative.hideLoading();

                let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, '/crcouncilvoting/crmember');
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
