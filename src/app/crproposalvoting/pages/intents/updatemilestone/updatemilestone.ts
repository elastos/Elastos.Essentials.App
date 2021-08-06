import { Component, NgZone, ViewChild } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { ActivatedRoute } from '@angular/router';
import { CROperationsService, CRWebsiteCommand } from '../../../services/croperations.service';
import { PopupService } from '../../../services/popup.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { Util } from 'src/app/model/util';
import { ProposalDetails } from 'src/app/crproposalvoting/model/proposal-details';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

type UpdateMilestoneCommand = CRWebsiteCommand & {
    data: {
        messagehash: string,
        newownerpubkey: string,
        ownerpubkey: string,
        proposalhash: string,
        proposaltrackingtype: string,
        stage: number,
        userdid: string
    },
}

@Component({
    selector: 'page-update-milestone',
    templateUrl: 'updatemilestone.html',
    styleUrls: ['./updatemilestone.scss']
})
export class UpdatMilestonePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private originalRequestJWT: string;
    private updateMilestoneCommand: UpdateMilestoneCommand;
    public signingAndSendingSuggestionResponse = false;
    public proposalDetails: ProposalDetails;
    public proposalDetailsFetched = false;

    constructor(
        private proposalService: ProposalService,
        private crOperations: CROperationsService,
        private popup: PopupService,
        public translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService,
        private walletManager: WalletManager,
        private voteService: VoteService,
        public theme: GlobalThemeService,
    ) {

    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crproposalvoting.update-milestone'));
        this.updateMilestoneCommand = this.crOperations.onGoingCommand as UpdateMilestoneCommand;
        this.originalRequestJWT = this.crOperations.originalRequestJWT;

        try {
            // Fetch more details about this proposal, to display to the user
            this.proposalDetails = await this.proposalService.fetchProposalDetails(this.updateMilestoneCommand.data.proposalhash);
            Logger.log('crproposal', "proposalDetails", this.proposalDetails);
            this.proposalDetailsFetched = true;
        }
        catch (err) {
            Logger.error('crproposal', 'UpdatMilestonePage ionViewDidEnter error:', err);
        }

    }

    cancel() {
        this.globalNav.navigateBack();
    }

    async signAndUpdateMilestone() {
        this.signingAndSendingSuggestionResponse = true;

        try {
            // Create the suggestion/proposal digest - ask the SPVSDK to do this with a silent intent.
            let digest = await this.getMilestoneDigest();

            let signedJWT = await this.signMilestoneDigestAsJWT(digest);

            if (signedJWT) {
                await this.proposalService.sendProposalCommandResponseToCallbackURL(this.updateMilestoneCommand.callbackurl, signedJWT);
                //Go to launcher
                this.globalNav.goToLauncher();
            }
        }
        catch (e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.popup.alert("Error", "Sorry, unable to update milestone. Your milestone can't be updated for now. " + e, "Ok");
        }

        this.signingAndSendingSuggestionResponse = false;
    }

    private async getMilestoneDigest(): Promise<string> {
        let payload = this.getMilestonePayload(this.updateMilestoneCommand);
        Logger.log('crproposal', "milestone payload", payload);
        let digest = await this.walletManager.spvBridge.proposalTrackingOwnerDigest(this.voteService.masterWalletId, StandardCoinName.ELA, JSON.stringify(payload));
        let ret = Util.reverseHexToBE(digest);

        Logger.log('crproposal', "Got milestone digest.", ret);
        return ret;
    }

    private async signMilestoneDigestAsJWT(suggestionDigest: string): Promise<string> {
        Logger.log('crproposal', "Sending intent to sign the suggestion digest", suggestionDigest);
        try {
            let result = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", {
                data: suggestionDigest,
                signatureFieldName: "data",
                jwtExtra: {
                    type: "signature",
                    command: this.updateMilestoneCommand.command,
                    req: "elastos://crproposal/" + this.originalRequestJWT
                }
            });
            Logger.log('crproposal', "Got signed digest.", result);

            if (!result.result || !result.responseJWT) {
                // Operation cancelled by user
                return null;
            }

            Logger.log('crproposal', "signedJWT", result.responseJWT);

            return result.responseJWT;
        }
        catch (err) {
            Logger.error('crproposal', "didsign send intent error", err);
            throw err;
        }
    }

    private getMilestonePayload(command: UpdateMilestoneCommand): any {
        let payload = {
            ProposalHash: command.data.proposalhash,
            MessageHash: command.data.messagehash,
            // MessageData: "",
            Stage: command.data.stage,
            OwnerPublicKey: command.data.ownerpubkey,
            NewOwnerPublicKey: command.data.newownerpubkey,
        };
        return payload;
    }

    private async exitIntentWithSuccess() {
        await this.crOperations.sendIntentResponse();
    }

    private async exitIntentWithError() {
        await this.crOperations.sendIntentResponse();
    }
}