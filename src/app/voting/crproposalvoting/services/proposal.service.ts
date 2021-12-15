import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { ProposalDetails } from '../model/proposal-details';
import { ProposalSearchResult } from '../model/proposal-search-result';
import { ProposalStatus } from '../model/proposal-status';

@Injectable({
    providedIn: 'root'
})
export class ProposalService {
    public allSearchResults: ProposalSearchResult[] = [];
    private pageNumbersLoaded = 0;
    private cr_rpc_api = 'https://api.cyberrepublic.org';
    private subscription: Subscription = null;

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        private globalNetworksService: GlobalNetworksService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) { }

    // async init() {
    //     this.subscription = this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
    //         this.cr_rpc_api = this.getCRProposalAPI();
    //     });
    //     this.cr_rpc_api = this.getCRProposalAPI();
    // }

    public stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.allSearchResults = [];
        this.pageNumbersLoaded = 0;
    }

    public reset() {
        this.allSearchResults = [];
        this.pageNumbersLoaded = 0;
    }

    private getCrRpcApi(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
    }

    public async fetchProposals(status: ProposalStatus, page: number): Promise<ProposalSearchResult[]> {
        if (this.pageNumbersLoaded >= page) {
            return this.allSearchResults;
        }

        try {
            var url = this.getCrRpcApi() + '/api/v2/proposal/all_search?status=' + status + '&page=' + page + '&results=10';
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, "fetchProposals", url, result);
            if (this.pageNumbersLoaded < page) {
                if (result && result.data && result.data.proposals) {
                    this.allSearchResults = this.allSearchResults.concat(result.data.proposals);
                    this.pageNumbersLoaded = page;
                }
                else {
                    Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposals can not get proposals!');
                }
            }
            return this.allSearchResults;
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposals error:', err);
        }
    }

    public async fetchProposalDetails(proposalHash: string/*proposalId: number*/): Promise<ProposalDetails> {
        try {
            Logger.log(App.CRPROPOSAL_VOTING, 'Fetching proposal details for proposal ' + proposalHash + '...');
            let url = this.getCrRpcApi() + '/api/v2/proposal/get_proposal/' + proposalHash;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, result);
            if (result && result.data) {
                return result.data;
            }
            else {
                Logger.error(App.CRPROPOSAL_VOTING, 'cat not get data');
            }
        }
        catch (err) {
            Logger.error(App.CRPROPOSAL_VOTING, 'fetchProposalDetails error:', err);
        }
    }

    public async fetchSearchedProposal(page = 1, status: ProposalStatus, search?: string): Promise<ProposalSearchResult[]> {
        Logger.log(App.CRPROPOSAL_VOTING, 'Fetching searched proposal for status: ' + status, + 'with search: ' + search);
        try {
            var url = this.getCrRpcApi() + '/api/v2/proposal/all_search?page=' + page + '&results=10&status=' + status + '&results=10&search=' + search;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRPROPOSAL_VOTING, 'fetchSearchedProposal:' + result);
            if (result && result.data) {
                return result.data.proposals;
            }
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

    public navigateToProposalDetailPage(proposal: ProposalSearchResult) {
        void this.nav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/proposal-details", { state: { proposalHash: proposal.proposalHash } });

        /* this.router.navigate(["/crproposalvoting/proposal-details"], {
            queryParams: {
                proposalId: proposal.id
            }
        }) */
    }

    public getFetchedProposalById(proposalId: number): ProposalSearchResult {
        return this.allSearchResults.find((proposal) => {
            return proposal.id == proposalId;
        })
    }

}