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
import { ProposalDetails } from '../model/proposal-details';
import { SuggestionDetail } from '../model/suggestion-model';
import { PopupService } from './popup.service';
import { ProposalService } from './proposal.service';
import { SuggestionService } from './suggestion.service';

declare let didManager: DIDPlugin.DIDManager;

export enum CRCommandType {
    SuggestionDetailPage = "suggestion-detail-page",
    ProposalDetailPage = "proposal-detail-page",
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
    private sendingSignDigest = false;

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
        Logger.log(App.VOTING, "Command:", crCommand);
        return await this.handleCRProposalCommand(crCommand, crProposalJwtRequest);
    }

    public handleProposalDetailPageCommand(commandName: string, exData?: any) {
        let data = this.proposalService.currentProposal;
        if (exData) {
            data = Object.assign(data, exData);
        }
        let crCommand = { command: commandName, data: data, type: CRCommandType.ProposalDetailPage } as CRCommand;
        Logger.log(App.CRPROPOSAL_VOTING, "Command:", crCommand);
        void this.handleCRProposalCommand(crCommand, null);
    }

    public handleSuggestionDetailPageCommand(commandName: string, exData?: any) {
        let data =  this.suggestionService.currentSuggestion;
        if (exData) {
            data = Object.assign(data, exData);
        }
        let crCommand = { command: commandName, data: data, sid: data.sid, type: CRCommandType.SuggestionDetailPage } as CRCommand;
        Logger.log(App.CRSUGGESTION, "Command:", crCommand);
        void this.handleCRProposalCommand(crCommand, null);
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

        switch (crCommand.command) {
            case "createsuggestion":
            case "createproposal":
            case "reviewproposal":
            case "updatemilestone":
            case "reviewmilestone":
            case "voteforproposal":
            case "withdraw":
                break;

            default:
                Logger.warn('crproposal', "Unhandled CR command: ", crCommand.command);
                await this.globalPopupService.ionicAlert("common.error", "crproposalvoting.no-command-type");
        }

        await this.voteService.selectWalletAndNavTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/" + crCommand.command);

        return true;
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
                throw "crproposalvoting.no-draft-data";
            }
        }
        catch (err) {
            Logger.error('crsuggestion', 'getDraftData error:', err);
            throw "crproposalvoting.no-draft-data";
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
                throw "crproposalvoting.no-opinion-data";
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'getOpinionData error:', err);
            throw "crproposalvoting.no-opinion-data";
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
                throw "crproposalvoting.no-message-data";
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'getMessageData error:', err);
            throw "crproposalvoting.no-message-data";
        }
    }
    public async getData(): Promise<boolean> {
        let data = this.onGoingCommand.data;
        data.categorydata = data.categorydata || "";
        data.ownerPublicKey = data.ownerpublickey || data.ownerPublicKey,
        data.proposalHash = data.proposalhash || data.proposalHash;

        try {
            switch (this.onGoingCommand.command) {
                case "createsuggestion":
                case "createproposal":
                    data.draftHash = data.drafthash || data.draftHash;
                    data.draftData = await this.getDraftData(data.draftHash);
                    data.targetproposalhash = data.targetproposalhash || data.targetProposalhash || data.targetProposalHash;
                    data.ownerPublicKey = data.ownerPublicKey || data.ownerpublicKey || await this.getSelfPublicKey();
                    data.newRecipient = data.newrecipient || data.newRecipient;
                    data.newOwnerPublicKey = data.newownerpublickey || data.newOwnerPublicKey;
                    data.newOwnerSignature = data.newownersignature || data.newOwnerSignature;
                    data.newSecretaryDID = data.newSecretaryDID || data.secretarygeneraldid;
                    data.newSecretaryPublicKey = data.secretarygeneralpublickey || data.newSecretaryPublicKey;
                    data.newSecretarySignature = data.secretarygenerasignature || data.newSecretarySignature;
                    break;
                case "reviewproposal":
                    if (this.onGoingCommand.type == CRCommandType.Scan) {
                        data.opinionData = await this.getOpinionData(data.opinionHash);
                    }
                    break;
                case "updatemilestone":
                    if (this.onGoingCommand.type == CRCommandType.Scan) {
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
                            data.ownerPublicKey = ret.ownerPublicKey;
                            data.ownerSignature = ret.ownerSignature;
                        }
                        if (this.onGoingCommand.type == CRCommandType.Scan) {
                            data.secretaryOpinionHash = data.secretaryopinionhash || data.secretaryOpinionHash;
                            data.secretaryOpinionData = await this.getOpinionData(data.secretaryOpinionHash);
                        }
                    break;
                case "voteforproposal":
                case "withdraw":
                    break;
            }
        }
        catch (errMessage) {
            Logger.error(App.CRSUGGESTION, this.onGoingCommand.command  + ' getData error:', errMessage);
            await this.globalPopupService.ionicAlert("common.error", errMessage);
            return false;
        }
        return true;
    }

    public async getCurrentSuggestion(): Promise<SuggestionDetail> {
        if (!await this.getData()) {
            return null;
        }

        let ret = await this.suggestionService.getCurrentSuggestion(this.onGoingCommand.sid,
            this.onGoingCommand.type != CRCommandType.SuggestionDetailPage);
        if (ret == null) {
            await this.globalPopupService.ionicAlert("common.error", "crproposalvoting.no-suggestion-detail");
        }
        return ret;
    }

    public async getCurrentProposal(): Promise<ProposalDetails> {
        if (!await this.getData()) {
            return null;
        }

        let ret = await this.proposalService.getCurrentProposal(this.onGoingCommand.data.proposalHash,
                                                this.onGoingCommand.type != CRCommandType.ProposalDetailPage);
        if (ret == null) {
            await this.globalPopupService.ionicAlert("common.error", "crproposalvoting.no-proposal-detail");
        }
        return ret;
    }


    public async sendIntentResponse(result?: any) {
        if (!this.sendingSignDigest && this.intentId && this.intentId != null) {
            await this.globalIntentService.sendIntentResponse({}, this.intentId);
            this.intentId = null;
        }
    }

    public async sendSignDigestIntent(params: any): Promise<any> {
        this.sendingSignDigest = true;
        try {
            let ret = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", params, this.intentId);
            this.sendingSignDigest = false;
            Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", ret);
            if (!ret || !ret.result || !(ret.result.signature || ret.result[params.signatureFieldName])) {
                return null;
            }
            return ret;
        }
        catch (err) {
            this.sendingSignDigest = false;
            Logger.error('crsuggestion', 'sendSignDigestIntent error:', err);
            throw err;
        }
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

    async getSelfPublicKey(): Promise<string> {
        let base58Key = await DIDService.instance.getActiveDid().getLocalDIDDocument().getDefaultPublicKey();
        let buf = new Buffer(Base58.decode(base58Key));
        let ret = buf.toString('hex');
        return ret;
    }

    public async signAndSendRawTransaction(rawTx: any) {
        Logger.log(App.CRPROPOSAL_VOTING, 'signAndSendRawTransaction rawTx:', rawTx);

        if (!rawTx) {
            throw new Error("rawTx is null");
        }

        const result = await this.voteService.signAndSendRawTransaction(rawTx);
        if (result.published) {
            this.handleSuccessReturn();
        }
        else {
            // throw new Error(result.message); // sourceSubwallet.signAndSendRawTransaction have handle error.
            throw new Error("");
        }
    }

    public handleSuccessReturn() {
        this.goBack();
        this.globalNative.genericToast('crproposalvoting.' + this.onGoingCommand.command + '-successfully', 2000, "success");
    }

    public async popupErrorMessage(error: any) {
        if (!error) {
            return;
        }

        var message = "";
        if (error instanceof String) {
            message = error as string;
        }
        else if ((error instanceof Object) && error.message) {
            message = error.message;
        }

        if (message == "") {
            return;
        }

        await this.globalPopupService.ionicAlert("common.error", this.translate.instant('crproposalvoting.' + this.onGoingCommand.command + '-failed') + "[" + message + "]");
        Logger.error('crproposal', this.onGoingCommand.command + ' error:', message);
    }
}
