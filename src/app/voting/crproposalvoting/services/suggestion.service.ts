import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Config } from 'src/app/wallet/config/Config';
import { SuggestionDetail, SuggestionSearchResult, SuggestionStatus } from '../model/suggestion-model';

@Injectable({
    providedIn: 'root'
})
export class SuggestionService {
    public allResults: SuggestionSearchResult[] = [];
    public allSearchResults: SuggestionSearchResult[] = [];
    private pageNumbersLoaded = 0;
    private subscription: Subscription = null;
    public selectedSuggestion: SuggestionSearchResult;
    public blockWaitingDict = {};
    public currentSuggestion: SuggestionDetail = null;

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) { }

    init() {

    }

    public stop() {
        this.allResults = [];
        this.allSearchResults = [];
        this.pageNumbersLoaded = 0;
    }

    public reset() {
        this.allResults = [];
        this.allSearchResults = [];
        this.pageNumbersLoaded = 0;
    }

    private getCrRpcApi(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
    }

    public async fetchSuggestions(status: SuggestionStatus, page: number, results = 10): Promise<SuggestionSearchResult[]> {
        try {
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=' + results;
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, "fetchSuggestions", url, result);
            if (this.pageNumbersLoaded < page) {
                if (result && result.data && result.data.suggestions) {
                    this.allResults = this.allResults.concat(result.data.suggestions);
                    this.pageNumbersLoaded = page;
                }
                else {
                    Logger.error(App.CRSUGGESTION, 'fetchSuggestions can not get suggestions!');
                }
            }
            return this.allResults;
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'fetchSuggestions error:', err);
        }
    }

    public async fetchSuggestionDetail(suggestionId: string): Promise<SuggestionDetail> {
        try {
            this.currentSuggestion = null;
            Logger.log(App.CRSUGGESTION, 'Fetching suggestion details for suggestion ' + suggestionId + '...');
            let url = this.getCrRpcApi() + '/api/v2/suggestion/get_suggestion/' + suggestionId;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, result);
            if (result && result.data) {
                let detail = result.data;
                if (detail.budgets && (detail.budgets.length > 0) && (detail.budgets[0].stage == 0)) {
                    detail.stageAdjust = 1;
                }
                else {
                    detail.stageAdjust = 0;
                }
                detail.sid = suggestionId;
                this.currentSuggestion = detail;
                //TODO:: temp for api-3 result is newrecipient
                detail.newRecipient = detail.newRecipient || detail.newrecipient;
                return detail;
            }
            else {
                Logger.error(App.CRSUGGESTION, 'cat not get data');
            }
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'fetchSuggestionDetail error:', err);
        }

        return null;
    }

    public async getCurrentSuggestion(suggestionId: string, refresh = false): Promise<SuggestionDetail> {
        if (refresh || this.currentSuggestion == null || this.currentSuggestion.sid != suggestionId) {
            return await this.fetchSuggestionDetail(suggestionId);
        }
        else {
            return this.currentSuggestion;
        }
    }

    public async fetchSearchedSuggestion(page = 1, status: SuggestionStatus, search?: string): Promise<SuggestionSearchResult[]> {
        if (page == 1) {
            this.allSearchResults = [];
        }

        try {
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=10&search=' + search;
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, 'fetchSearchedSuggestion:', url, result);
            if (result && result.data) {
		this.allSearchResults = this.allSearchResults.concat(result.data.suggestions);
            }
            return this.allSearchResults;
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'fetchSearchedSuggestion error:', err);
        }
    }

    /**
     * Returns a JWT result to a given callback url, as a response to a CR command/action.
     * Ex: scan "createsuggestion" qr code -> return the response to the callback.
     */
    public async postSignSuggestionCommandResponse(jwtToken: string): Promise<void> {
        const param = {
            jwt: jwtToken,
        };

        let url = this.getCrRpcApi() + "/api/v2/suggestion/signature";
        Logger.log(App.CRSUGGESTION, 'postSignSuggestionCommandResponse:', url, jwtToken);
        try {
            const result = await this.jsonRPCService.httpPost(url, param);
            Logger.log(App.CRSUGGESTION, 'postSignSuggestionCommandResponse', result);
            if (result && result.code) {
            }
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'postSignSuggestionCommandResponse error', err);
            throw new Error(err);
        }
    }

    public getFetchedSuggestionById(suggestionId: number): SuggestionSearchResult {
        return this.allSearchResults.find((suggestion) => {
            return suggestion.id == suggestionId;
        })
    }

    public addBlockWatingItem(suggestionId: string, status: string) {
        this.blockWaitingDict[suggestionId] = status;
    }

    //If the current status changed, will be remove
    public needBlockWating(suggestionId: string, status: string): boolean {
        if (this.blockWaitingDict[suggestionId] && this.blockWaitingDict[suggestionId] == status) {
            return true;
        }
        return false;
    }

    public removeBlockWatingItem(suggestionId: string) {
        if (this.blockWaitingDict[suggestionId]) {
            delete this.blockWaitingDict[suggestionId];
        }
    }

    //-----------------get paylaod ---------------------
    private getPayloadCommon(data: any): any {
        return {
            CategoryData: data.categorydata || "",
            OwnerPublicKey: data.ownerPublicKey,
            DraftHash: data.draftHash,
            DraftData: data.draftData,
        }
    }

    private getNormalPayload(data: any): any {
        let payload = this.getPayloadCommon(data);
        payload = Object.assign(payload, {
            Type: 0,
            Budgets: [],
            Recipient: data.recipient,
        });

        // Need to convert from the API "string" type to SPV SDK "int"...
        let budgetTypes = {
            imprest: 0,
            normalpayment: 1,
            finalpayment: 2
        }

        for (let suggestionBudget of data.budgets) {
            payload.Budgets.push({
                Type: budgetTypes[suggestionBudget.type.toLowerCase()],
                Stage: suggestionBudget.stage,
                Amount: suggestionBudget.amount
            });
        }

        return payload;
    }

    private getChangeOwnerPayload(data: any): any {
        let payload = this.getPayloadCommon(data);
        payload = Object.assign(payload, {
            TargetProposalHash: data.targetproposalhash,
            NewRecipient: data.newRecipient,
            NewOwnerPublicKey: data.newownerpublickey,
            NewOwnerSignature: data.newownersignature,
        });
        return payload;
    }

    private getTerminatePayload(data: any): any {
        let payload = this.getPayloadCommon(data);
        payload.TargetProposalHash = data.targetproposalhash;
        return payload;
    }

    private getSecretaryGeneralPayload(data: any): any {
        let payload = this.getPayloadCommon(data);
        payload = Object.assign(payload, {
            SecretaryGeneralPublicKey: data.secretarygeneralpublickey,
            SecretaryGeneralDID: data.secretarygeneraldid.replace("did:elastos:", ""),
            SecretaryGeneralSignature: data.secretarygenerasignature,
        });

        return payload;
    }

    private getReserveCustomizeDidPayload(data: any, suggestionDetail: SuggestionDetail): any {
        let payload = this.getPayloadCommon(data);
        payload.ReservedCustomIDList = suggestionDetail.reservedCustomizedIDList;
        return payload;
    }

    private getReceiveCustomizeDidPayload(data: any, suggestionDetail: SuggestionDetail): any {
        let payload = this.getPayloadCommon(data);
        payload = Object.assign(payload, {
            ReceivedCustomIDList: suggestionDetail.receivedCustomizedIDList,
            ReceiverDID: suggestionDetail.receiverDID,
        });

        return payload;
    }

    private getChangeCustomIDFeeOwnerPayload(data: any, suggestionDetail: SuggestionDetail): any {
        let payload = this.getPayloadCommon(data);
        payload.CustomIDFeeRateInfo = {
            RateOfCustomIDFee: suggestionDetail.rateOfCustomizedIDFee,
            EIDEffectiveHeight: suggestionDetail.EIDEffectiveHeight
        }
        return payload;
    }

    private getRegisterSideChainPayload(data: any, suggestionDetail: SuggestionDetail): any {
        let payload = this.getPayloadCommon(data);
        payload.SidechainInfo = {
                SideChainName: suggestionDetail.sideChainName,
                MagicNumber: suggestionDetail.magicNumber,
                GenesisHash: suggestionDetail.genesisHash,
                ExchangeRate: Util.accMul(suggestionDetail.exchangeRate, Config.SELA),
                EffectiveHeight: suggestionDetail.effectiveHeight,
                ResourcePath: suggestionDetail.resourcePath,
        }
        return payload;
    }

    public getPayload(proposaltype: string, data: any, suggestionDetail: SuggestionDetail) {
        switch (proposaltype) {
            case "normal":
                return this.getNormalPayload(data);
            case "changeproposalowner":
                return this.getChangeOwnerPayload(data);
            case "closeproposal":
                return this.getTerminatePayload(data);
            case "secretarygeneral":
                return this.getSecretaryGeneralPayload(data);
            case "reservecustomizedid":
                return this.getReserveCustomizeDidPayload(data, suggestionDetail);
            case "receivecustomizedid":
                return this.getReceiveCustomizeDidPayload(data, suggestionDetail);
            case "changecustomizedidfee":
                return this.getChangeCustomIDFeeOwnerPayload(data, suggestionDetail);
            case "registersidechain":
                return this.getRegisterSideChainPayload(data, suggestionDetail);
            default:
                throw new Error("Don't support this type: " + proposaltype);
        }
    }

    public getProposalTypeForChangeProposal(proposaltype: string, suggestionDetail: SuggestionDetail) {
        if (proposaltype == "changeproposalowner" && suggestionDetail.newRecipient && !suggestionDetail.newOwnerDID) {
            proposaltype = "changeproposaladdress";
        }
        return proposaltype
    }
}