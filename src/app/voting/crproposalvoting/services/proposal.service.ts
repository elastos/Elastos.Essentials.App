import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { ProposalDetails } from '../model/proposal-details';
import { ProposalSearchResult } from '../model/proposal-search-result';
import { ProposalStatus } from '../model/proposal-status';

@Injectable({
    providedIn: 'root'
})
export class ProposalService {
    public allResults: ProposalSearchResult[] = [];
    public allSearchResults: ProposalSearchResult[] = [];
    private pageNumbersLoaded = 0;
    public blockWaitingDict = {};
    public currentProposal: ProposalDetails = null;

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private translate: TranslateService,
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

    private getElaRpcApi(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
    }

    public async fetchProposals(status: ProposalStatus, page: number, results = 10): Promise<ProposalSearchResult[]> {
        try {
            var url = this.getCrRpcApi() + '/api/v2/proposal/all_search?status=' + status + '&page=' + page + '&results=' + results;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, "fetchProposals", url, result);
            if (this.pageNumbersLoaded < page) {
                if (result && result.data && result.data.proposals) {
                    this.allResults = this.allResults.concat(result.data.proposals);
                    this.pageNumbersLoaded = page;
                }
                else {
                    Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposals can not get proposals!');
                }
            }
            return this.allResults;
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposals error:', err);
            return [];
        }
    }

    public async fetchProposalDetails(proposalHash: string/*proposalId: number*/): Promise<ProposalDetails> {
        try {
            this.currentProposal = null;
            Logger.log(App.CRPROPOSAL_VOTING, 'Fetching proposal details for proposal ' + proposalHash + '...');
            let url = this.getCrRpcApi() + '/api/v2/proposal/get_proposal/' + proposalHash;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, result);
            if (result && result.data) {
                let detail = result.data;
                if (detail.budgets && (detail.budgets.length > 0) && (detail.budgets[0].stage == 0)) {
                    detail.stageAdjust = 1;
                }
                else {
                    detail.stageAdjust = 0;
                }
                this.currentProposal = detail;
                return detail;
            }
            else {
                Logger.error(App.CRPROPOSAL_VOTING, 'cat not get data');
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposalDetails error:', err);
        }
        return null;
    }

    public async getCurrentProposal(proposalHash: string, refresh = false): Promise<ProposalDetails> {
        if (refresh || this.currentProposal == null || this.currentProposal.proposalHash != proposalHash) {
            return await this.fetchProposalDetails(proposalHash);
        }
        else {
            return this.currentProposal;
        }
    }

    public async fetchSearchedProposal(page = 1, status: ProposalStatus, search?: string): Promise<ProposalSearchResult[]> {
        if (page == 1) {
            this.allSearchResults = [];
        }

        try {
            var url = this.getCrRpcApi() + '/api/v2/proposal/all_search?page=' + page + '&results=10&status=' + status + '&results=10&search=' + search;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, 'fetchSearchedProposal:', url, result);
            if (result && result.data) {
                if (page == 1) {
                    this.allSearchResults = result.data.proposals;
                }
                else {
                    this.allSearchResults = this.allSearchResults.concat(result.data.proposals);
                }
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchSearchedProposal error:', err);
        }
        return this.allSearchResults;
    }

    /**
     * Returns a JWT result to a given callback url, as a response to a CR command/action.
     * Ex: scan "createsuggestion" qr code -> return the response to the callback.
     */
    public sendProposalCommandResponseToCallbackURL(callbackUrl: string, jwtToken: string): Promise<void> {
        return new Promise((resolve, reject) => {
            Logger.log('crproposal', "Calling callback url: " + callbackUrl);

            let headers = new HttpHeaders({
                'Content-Type': 'application/json'
            });

            this.http.post<any>(callbackUrl, {
                jwt: jwtToken
            }, { headers: headers }).subscribe((res) => {
                Logger.log('crproposal', "Callback url response success", res);
                resolve();
            }, (err) => {
                Logger.error('crproposal', err);

                if (err.error && err.error.message)
                    reject(err.error.message); // Improved message
                else
                    reject(err); // Raw error
            });
        });
    }

    public async postUpdateMilestoneCommandResponse(jwtToken: string, callbackUrl: string): Promise<void> {
        const param = {
            jwt: jwtToken,
        };

        if (!callbackUrl) {
            callbackUrl = this.getCrRpcApi() + "/api/v2/proposal/milestone";
        }

        Logger.log(App.CRPROPOSAL_VOTING, 'postUpdateMilestoneCommandResponse:', callbackUrl, jwtToken);
        try {
            const result = await this.jsonRPCService.httpPost(callbackUrl, param);
            Logger.log(App.CRPROPOSAL_VOTING, 'postUpdateMilestoneCommandResponse', result);
            if (result && result.code) {
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'postUpdateMilestoneCommandResponse error', err);
            throw new Error(err);
        }
    }

    public navigateToProposalDetailPage(proposal: ProposalSearchResult) {
        void this.nav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/proposal-details", { state: { proposalHash: proposal.proposalHash } });

        /* this.router.navigate(["/crproposalvoting/proposal-details"], {
            queryParams: {
                proposalId: proposal.id
            }
        }) */
    }

    public getFetchedProposalById(proposalId: number): ProposalSearchResult {
        return this.allResults.find((proposal) => {
            return proposal.id == proposalId;
        })
    }

    async getCrProposalState(proposalHash: string): Promise<any> {
        Logger.log(App.CRPROPOSAL_VOTING, 'Get cr proposal state...');

        const param = {
            method: 'getcrproposalstate',
            params: {
                proposalhash: proposalHash,
            },
        };

        var ret;
        try {
            const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
            Logger.log(App.CRPROPOSAL_VOTING, 'Get cr proposal state', result);
            if (result && result.proposalstate && result.proposalstate) {
                ret = result.proposalstate;
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'getcrproposalstate error', err);
        }

        return ret;
    }

    async getRemainingTime(proposal: ProposalDetails): Promise<string> {
        var ret;
        var remainingTime = -1;
        if (proposal.status == "registered" || proposal.status == "cragreed") {
            let state = await this.getCrProposalState(proposal.proposalHash);
            if (state && state.registerheight) {
                let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
                if (currentHeight >= state.registerheight) {
                    if (proposal.status == "registered") {
                        remainingTime = (720 * 7 - (currentHeight - state.registerheight)) * 2;
                    }
                    else if (proposal.status == "cragreed") {
                        remainingTime = (720 * 14 - (currentHeight - state.registerheight)) * 2;
                    }
                }
            }
        }

        if (remainingTime > 0) {
            ret = this.getRemainingTimeString(remainingTime);
        }
        return ret;
    }

    getRemainingTimeString(remainingTime: number): Promise<string> {
        var ret;
        if (remainingTime >= (1440 * 2)) { //more 2 days
            ret = Math.floor(remainingTime / 1440) + " " + this.translate.instant('crproposalvoting.days');
        }
        else if (remainingTime > 1440) {
            ret = "1 " + this.translate.instant('crproposalvoting.day') + " " + Math.floor((remainingTime % 1440) / 60) + " " + this.translate.instant('crproposalvoting.hours');
        }
        else if (remainingTime == 1440) {
            ret = "1 " + this.translate.instant('crproposalvoting.day');
        }
        else if (remainingTime > 60) {
            ret = Math.floor(remainingTime / 60) + " " + this.translate.instant('crproposalvoting.hours');
        }
        else {
            ret = remainingTime + " " + this.translate.instant('crproposalvoting.minutes');
        }
        return ret;
    }

    async fetchWithdraws(proposalHash: string): Promise<number> {
        Logger.log(App.CRPROPOSAL_VOTING, 'Fetching withdraw..');

        const param = {
            method: 'getcrproposalstate',
            params: {
                proposalhash: proposalHash,
            },
        };

        var amount = 0;
        try {
            const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
            if (result && result.proposalstate && result.proposalstate.proposal && !Util.isEmptyObject(result.proposalstate.proposal.budgets)) {
                let budgets = result.proposalstate.proposal.budgets;
                Logger.log(App.CRCOUNCIL_VOTING, "proposal budgets:", budgets);

                for (let budget of budgets) {
                    if (budget.status == "Withdrawable") {
                        amount += parseFloat(budget.amount);
                    }
                }
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'fetchWithdraws error', err);
        }
        Logger.log(App.CRCOUNCIL_VOTING, "withdraw amount:", amount);
        return amount;
    }

    public addBlockWatingItem(hash: string, status: string) {
        this.blockWaitingDict[hash] = status;
    }

    //If the current status changed, will be remove
    public needBlockWating(hash: string, status: string): boolean {
        if (this.blockWaitingDict[hash] && this.blockWaitingDict[hash] == status) {
            return true;
        }
        return false;
    }

    public removeBlockWatingItem(hash: string) {
        if (this.blockWaitingDict[hash]) {
            delete this.blockWaitingDict[hash];
        }
    }
}