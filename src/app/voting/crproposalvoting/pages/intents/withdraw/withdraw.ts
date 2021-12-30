import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { ProposalService } from 'src/app/voting/crproposalvoting/services/proposal.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CRCommand, CROperationsService } from '../../../services/croperations.service';

type WithdrawCommand = CRCommand & {
    data: {
        amount: number,
        ownerpublickey: string,
        proposalhash: string,
        recipient: string,
        userdid: string,
    },
}
@Component({
    selector: 'page-withdraw',
    templateUrl: 'withdraw.html',
    styleUrls: ['./withdraw.scss']
})
export class WithdrawPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private onGoingCommand: WithdrawCommand;
    public signingAndSendingProposalResponse = false;
    public proposalDetail: ProposalDetails;
    public proposalDetailFetched = false;
    public Config = Config;

    constructor(
        private crOperations: CROperationsService,
        public translate: TranslateService,
        private walletManager: WalletService,
        private voteService: VoteService,
        private proposalService: ProposalService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.withdraw'));
        if (this.proposalDetail) {
            return;
        }
        this.proposalDetailFetched = false;

        this.onGoingCommand = this.crOperations.onGoingCommand as WithdrawCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "WithdrawCommand", this.onGoingCommand);

        this.proposalDetail = await this.crOperations.getCurrentProposal();
        this.proposalDetailFetched = true;

        if (this.proposalDetail) {
            this.onGoingCommand.data.ownerPublicKey = await this.crOperations.getOwnerPublicKey();
        }
    }

    ionViewWillLeave() {
        void this.crOperations.sendIntentResponse();
    }

    cancel() {
        void this.globalNav.navigateBack();
    }

    async signAndWithdraw() {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndSendingProposalResponse = true;

        try {
            //Get payload
            var payload = this.getWithdrawPayload(this.onGoingCommand);
            Logger.log(App.CRPROPOSAL_VOTING, "Got payload.", payload);

            //Get digest
            var digest = await this.walletManager.spvBridge.proposalWithdrawDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
            digest = Util.reverseHexToBE(digest);
            Logger.log(App.CRPROPOSAL_VOTING, "Got proposal digest.", digest);

            //Get did sign digest
            let ret = await this.crOperations.sendSignDigestIntent({
                data: digest,
            });

            if (!ret) {
                // Operation cancelled, cancel the operation silently.
                this.signingAndSendingProposalResponse = false;
                return;
            }

            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
            //Create transaction and send
            payload.Signature = ret.result.signature;
            const rawTx = await this.voteService.sourceSubwallet.createProposalWithdrawTransaction(JSON.stringify(payload), '');
            await this.crOperations.signAndSendRawTransaction(rawTx);
        }
        catch (e) {
            this.signingAndSendingProposalResponse = false;
            await this.crOperations.popupErrorMessage(e);
            return;
        }

        this.signingAndSendingProposalResponse = false;
        void this.crOperations.sendIntentResponse();
    }

    private getWithdrawPayload(command: WithdrawCommand): any {
        let payload = {
            ProposalHash: command.data.proposalHash,
            OwnerPublicKey: command.data.ownerPublicKey,
            Recipient: command.data.recipient,
            Amount: command.data.amount,
        };
        return payload;
    }
}