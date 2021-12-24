import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import Base58 from 'base-58/Base58';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DIDService } from 'src/app/identity/services/did.service';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { PopupService } from './popup.service';
import { ProposalService } from './proposal.service';
import { SuggestionService } from './suggestion.service';

declare let didManager: DIDPlugin.DIDManager;

export enum CRCommandType {
    SuggestionDetailPage = "suggestion-detail-page",
    ProposalDetailPage = "proposal-detail-page",
    SuggestionListScan = "suggestion-list-scan",
    ProposalListScan = "proposal-list-scan",
    Scan = "scan",
}

export type CRCommand = {
    command: string; // Ex: "voteforproposal"
    callbackurl?: string;
    iss?: string; // JWT issuer (Normally, the CR website)
    data?: any;
    type: CRCommandType;
}

export type CreateSuggestionBudget = {
    amount: string, // SELA amount
    stage: number, // Ex: 1 // ?
    type: string    // Ex: "FinalPayment"
}
@Injectable({
    providedIn: 'root'
})
export class CROperationsService {
    private subscription: Subscription = null;

    public originalRequestJWT: string;
    public onGoingCommand: any;

    public intentAction: string;
    public intentId: number;
    public activeCommandReturn = new BehaviorSubject<CRCommandType>(null);

    constructor(
        private popup: PopupService,
        private globalIntentService: GlobalIntentService,
        private voteService: VoteService,
        public globalPopupService: GlobalPopupService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public suggestionService: SuggestionService,
        private proposalService: ProposalService,
        private translate: TranslateService,
    ) { }

    init() {
        this.subscription = this.globalIntentService.intentListener.subscribe((receivedIntent) => {
            if (receivedIntent)
                void this.handledReceivedIntent(receivedIntent);
        });
    }

    public stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    async addOnItemClickedListener(icon) {
        if (icon.key == "scan") {
            await this.handleScanAction();
        }
    }

    public async handleScanAction() {
        try {
            let data = await this.globalIntentService.sendIntent("scanqrcode", null);
            Logger.log("crproposal", "Scan result", data);
            if (data && data.result && data.result.scannedContent)
                await this.handleScannedContent(data.result.scannedContent);
            else
                Logger.warn('crproposal', "Unable to handle the scanned QR code - no scanned content info");
        }
        catch (err) {
            Logger.error('crproposal', err);
        }
    }

    private async handleScannedContent(scannedContent: string) {
        if (scannedContent.startsWith("https://did.elastos.net/crproposal/")) {
            let jwt = scannedContent.replace("https://did.elastos.net/crproposal/", "");
            await this.handleCRProposalJWTCommand(jwt);
        }
        else {
            Logger.warn('crproposal', "Unhandled QR code content:", scannedContent);
        }
    }

    private async handledReceivedIntent(receivedIntent: EssentialsIntentPlugin.ReceivedIntent) {
        if (receivedIntent.action == "https://did.elastos.net/crproposal") {
            await this.handleCRProposalIntentRequest(receivedIntent);

        }
    }

    private async handleCRProposalIntentRequest(receivedIntent: EssentialsIntentPlugin.ReceivedIntent) {
        if (!receivedIntent.originalJwtRequest) {
            Logger.error('crproposal', "Received a crproposal intent request that is not encoded as JWT, which is not allowed. Skipping the request");
            await this.sendIntentResponse();
        }
        else {
            this.intentId = receivedIntent.intentId;
            if (!await this.handleCRProposalJWTCommand(receivedIntent.originalJwtRequest)) {
                await this.sendIntentResponse();
            }
        }
    }

    private async handleCRProposalJWTCommand(crProposalJwtRequest: string): Promise<boolean> {
        // Parse this JWT and verify the signature. We need to make sure the issuer is on chain.
        let parsedJwtresult = await didManager.parseJWT(true, crProposalJwtRequest);
        if (!parsedJwtresult.signatureIsValid) {
            Logger.error('crproposal', "Invalid JWT received", parsedJwtresult);
            await this.popup.alert("Invalid JWT", parsedJwtresult.errorReason, "Ok");
            return false;
        }

        let crCommand = parsedJwtresult.payload as CRCommand;
        if (!crCommand.command) {
            await this.popup.alert("crproposal", "Received CR website command without a command field. Skipping.", "Ok");
            return false;
        }

        crCommand.type = CRCommandType.Scan;
        return await this.handleCRProposalCommand(crCommand, crProposalJwtRequest);
    }

    public handleProposalDetailPageCommand(commandName: string, exData?: any) {
        let data = this.proposalService.currentProposal;
        if (exData) {
            data = Object.assign(data, exData);
        }
        let crcommand = { command: commandName, data: data, type: CRCommandType.ProposalDetailPage } as CRCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "Command:", crcommand);
        void this.handleCRProposalCommand(crcommand, null);
    }

    public handleSuggestionDetailPageCommand(commandName: string, exData?: any) {
        let data =  this.suggestionService.currentSuggestion;
        if (exData) {
            data = Object.assign(data, exData);
        }
        let crcommand = { command: commandName, data: data, type: CRCommandType.SuggestionDetailPage } as CRCommand;
        Logger.log(App.CRSUGGESTION, "Command:", crcommand);
        void this.handleCRProposalCommand(crcommand, null);
    }

    public async handleCRProposalCommand(crCommand: CRCommand, originalRequestJWT?: string): Promise<boolean> {
        this.originalRequestJWT = originalRequestJWT;
        this.onGoingCommand = crCommand;
        let data = crCommand.data;

        if (!Util.isEmptyObject(data.userdid)) {
            if (crCommand.data.userdid != GlobalDIDSessionsService.signedInDIDString) {
                Logger.warn('crproposal', "The did isn't match");
                await this.globalPopupService.ionicAlert('wallet.text-warning', 'crproposalvoting.wrong-did');
                return false;
            }
        }

        data.categorydata = data.categorydata || "";
        data.ownerpublickey = data.ownerpublickey || data.ownerPublicKey,
        data.drafthash = data.drafthash || data.draftHash;
        data.proposalHash = data.proposalhash || data.proposalHash;

        switch (crCommand.command) {
            case "createsuggestion":
            case "createproposal":
                data.draftData = await this.getDraftData(data.drafthash);
                break;
            case "reviewproposal":
                if (crCommand.type == CRCommandType.Scan) {
                    data.opinionData = await this.getOpinionData(data.opinionHash);
                }
                break;
            case "updatemilestone":
                if (crCommand.type == CRCommandType.Scan) {
                    data.messageHash = data.messageHash || data.messagehash;
                    let ret = await this.getMessageData(data.messageHash);
                    if (ret != null) {
                        data.messageData = ret.content;
                    }
                }
                break;
            case "reviewmilestone":
                    data.messageHash = data.messageHash || data.messagehash;
                    let ret = await this.getMessageData(data.messageHash);
                    if (ret != null) {
                        data.messageData = ret.content;
                        data.ownerSignature = ret.ownerSignature;
                    }
                break;
            case "voteforproposal":
            case "withdraw":
                break;

            default:
                Logger.warn('crproposal', "Unhandled CR command: ", crCommand.command);
                await this.popup.alert("Unsupported command", "Sorry, this feature is currently not supported by this capsule", "Ok");
                return false;
        }
        await this.voteService.selectWalletAndNavTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/" + crCommand.command);

        return true;
    }

    public async sendIntentResponse(result?: any) {
        if (this.intentId && this.intentId != null) {
            await this.globalIntentService.sendIntentResponse({}, this.intentId);
            this.intentId = null;
        }
    }

    public async sendSignDigestIntent(params: any): Promise<any> {
        return await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", params, this.intentId);
    }

    public async getDraftData(draftHash: string): Promise<string> {
        if (!draftHash) {
            return null;
        }

        try {
            var url = this.voteService.getCrRpcApi() + '/api/v2/suggestion/draft_data/' + draftHash;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log('crsuggestion', "getDraftData", result);
            if (result && result.data && result.data.content) {
                return result.data.content;
            }
            else {
                Logger.error('crsuggestion', 'getDraftData can not get data!');
            }
        }
        catch (err) {
            Logger.error('crsuggestion', 'getDraftData error:', err);
        }
    }

    public async getOpinionData(opinionHash: string): Promise<string> {
        if (!opinionHash) {
            return null;
        }

        try {
            var url = this.voteService.getCrRpcApi() + '/api/v2/proposal/opinion_data/' + opinionHash;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, "getOpinionData", result);
            if (result && result.data && result.data.content) {
                return result.data.content;
            }
            else {
                Logger.error(App.CRPROPOSAL_VOTING, 'getOpinionData can not get data!');
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'getOpinionData error:', err);
        }
    }

    public async getMessageData(messageHash: string): Promise<any> {
        if (!messageHash) {
            return null;
        }

        try {
            var url = this.voteService.getCrRpcApi() + '/api/v2/proposal/message_data/' + messageHash;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, "getMessageData", result);
            if (result && result.data) {
                return result.data;
            }
            else {
                Logger.error(App.CRPROPOSAL_VOTING, 'getMessageData can not get data!');
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'getMessageData error:', err);
        }

        return null;
    }

    public goBack() {
        let type = this.onGoingCommand.type;
        this.activeCommandReturn.next(type);
        switch(type) {
            case CRCommandType.SuggestionDetailPage:
            case CRCommandType.ProposalDetailPage:
                void this.globalNav.navigateBack();
                break;
        }
    }

    async getOwnerPublicKey(): Promise<string> {
        let base58Key = await DIDService.instance.getActiveDid().getLocalDIDDocument().getDefaultPublicKey();
        let buf = new Buffer(Base58.decode(base58Key));
        let ret = buf.toString('hex');
        return ret;
    }

    public async signAndSendRawTransaction(rawTx: any) {
        Logger.log(App.CRPROPOSAL_VOTING, 'signAndSendRawTransaction rawTx:', rawTx);
        const result = await this.voteService.signAndSendRawTransaction(rawTx);
        if (result.published) {
            this.handleSuccessReturn();
        }
        else {
            throw new Error(result.message);
        }
    }

    public handleSuccessReturn() {
        this.goBack();
        this.globalNative.genericToast('crproposalvoting.' + this.onGoingCommand.command + '-successfully', 2000, "success");
    }

    public async popupErrorMessage(error: any) {
        var message = "";
        if (error instanceof String) {
            message = error as string;
        }
        else if ((error instanceof Object) && error.message) {
            message = error.message;
        }
        await this.globalPopupService.ionicAlert("common.error", this.translate.instant('crproposalvoting.' + this.onGoingCommand.command + '-failed') + "[" + message + "]");
        Logger.error('crproposal', this.onGoingCommand.command + ' error:', message);
    }
}
