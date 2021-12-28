import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
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
    private subscription: Subscription = null;
    public blockWaitingDict = {};
    public currentProposal: ProposalDetails = null;

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) { }

    init() {

    }

    public avatarList = {
        "Sunnyfenghan": "https://elanodes.com/wp-content/uploads/custom/images/SunnyFengHan.png",
        "Donald Bullers": "https://elanodes.com/wp-content/uploads/custom/images/DonaldBullers.png",
        "Elation Studios": "https://elanodes.com/wp-content/uploads/custom/images/ElationStudios2.png",
        "Mark Xing": "https://elanodes.com/wp-content/uploads/custom/images/MarkXing.png",
        "Brittany Kaiser": "https://elanodes.com/wp-content/uploads/custom/images/BrittanyKaiser.png",
        "Ryan | Starfish Labs": "https://elanodes.com/logos/Starfish.png",
        "SJun Song": "https://elanodes.com/wp-content/uploads/custom/images/SjunSong.png",
        "Rebecca Zhu": "https://elanodes.com/wp-content/uploads/custom/images/RebeccaZhu.png",
        "The Strawberry Council": "https://elanodes.com/wp-content/uploads/custom/images/TheStrawberryCouncil_1.png",
        "Zhang Feng": "https://elanodes.com/wp-content/uploads/custom/images/ZhangFeng_2.png",
        "Jingyu Niu": "https://elanodes.com/wp-content/uploads/custom/images/NiuJingyu.png",
        "Orchard Trinity": "https://elanodes.com/wp-content/uploads/custom/images/Orchard1.png",
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
                this.allSearchResults = this.allSearchResults.concat(result.data.proposals);
            }
            return this.allSearchResults;
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchSearchedProposal error:', err);
        }
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