import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopupService } from 'src/app/voting/crproposalvoting/services/popup.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CandidatesService } from '../../services/candidates.service';


@Component({
    selector: 'app-crnode',
    templateUrl: './crnode.page.html',
    styleUrls: ['./crnode.page.scss'],
})
export class CRNodePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public nodePublicKey: string;
    public crmemberInfo: any = {};

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletService,
        public voteService: VoteService,
        private globalIntentService: GlobalIntentService,
        public popupProvider: PopupProvider,
        private route: ActivatedRoute,
        private zone: NgZone,
        private popup: PopupService,
        public candidatesService: CandidatesService,
    ) {

    }

    ngOnInit() {
        Logger.log("CRNodePage", "ngOnInit")
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.claim-dpos-node'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
        this.crmemberInfo = this.candidatesService.selectedMember;
        this.nodePublicKey = this.crmemberInfo.dpospublickey;
    }

    async goTransaction() {
        try {
            //Get payload
            var payload = {
                NodePublicKey: this.nodePublicKey,
                CRCouncilMemberDID: this.crmemberInfo.did,
            } as any;
            Logger.log('crproposal', "Got review proposal payload.", payload);

            //Get digest
            var digest = await this.walletManager.spvBridge.CRCouncilMemberClaimNodeDigest(this.voteService.masterWalletId, StandardCoinName.ELA, payload);
            digest = Util.reverseHexToBE(digest);
            Logger.log('crproposal', "Got review proposal digest.", digest);

            //Get did sign digest
            let ret = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", {
                data: digest,
            });
            Logger.log('crproposal', "Got signed digest.", ret);
            if (!ret.result) {
                // Operation cancelled by user
                return null;
            }

            //Create transaction and send
            payload.CRCouncilMemberSignature = ret.result.signature;
            const rawTx = await this.voteService.sourceSubwallet.createCRCouncilMemberClaimNodeTransaction(payload, '');
            await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to sign your crproposal. Your crproposal can't be review for now. " + e, "Ok");
        }
    }
}
