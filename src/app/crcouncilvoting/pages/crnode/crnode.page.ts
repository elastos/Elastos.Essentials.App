import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import BigNumber from 'bignumber.js';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Util } from 'src/app/model/util';
import { PopupService } from 'src/app/crproposalvoting/services/popup.service';
import { App } from 'src/app/model/app.enum';


@Component({
    selector: 'app-crnode',
    templateUrl: './crnode.page.html',
    styleUrls: ['./crnode.page.scss'],
})
export class CRNodePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public nodePublicKey: string;
    public crmemberInfo: any;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletManager,
        public voteService: VoteService,
        private globalIntentService: GlobalIntentService,
        public popupProvider: PopupProvider,
        private route: ActivatedRoute,
        private zone: NgZone,
        private popup: PopupService,
    ) {
        this.route.queryParams.subscribe(async (data: { crmember: any}) => {
            this.zone.run(async () => {
                this.crmemberInfo = data.crmember;
                this.nodePublicKey = this.crmemberInfo.dpospublickey;
            });
        });
    }

    ngOnInit() {
        Logger.log("CRNodePage", "ngOnInit")
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilmanager.crnode-manager'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
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
