import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ProposalStatus } from '../model/proposal-status';
import { ProposalsSearchResponse } from '../model/proposal-search-response';
import { ProposalSearchResult } from '../model/proposal-search-result';
import { ProposalDetails } from '../model/proposal-details';
import { ProposalsDetailsResponse } from '../model/proposal-details-response';
import { SuggestionDetails } from '../model/suggestion-details';
import { SuggestionDetailsResponse } from '../model/suggestion-details-response';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum'
import { Subscription } from 'rxjs';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';

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
        private globalElastosAPIService: GlobalElastosAPIService
    ) { }

    async init() {
        this.subscription = this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
            this.cr_rpc_api = this.getCRProposalAPI();
        });
        this.cr_rpc_api = this.getCRProposalAPI();
    }

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

    private getCRProposalAPI(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
    }

    public fetchProposals(status: ProposalStatus, page: number): Promise<ProposalSearchResult[]> {
        return new Promise((resolve, reject) => {
            if (this.pageNumbersLoaded >= page) {
                resolve(this.allSearchResults);
            }

            Logger.log('crproposal', 'Fetching proposals... page:', page);
            this.http.get<any>(this.cr_rpc_api + '/api/cvote/all_search?status=' + status + '&page=' + page + '&results=10').subscribe((res: ProposalsSearchResponse) => {
                Logger.log('crproposal', res);
                if (this.pageNumbersLoaded < page) {
                    if (res && res.data && res.data.list) {
                        this.allSearchResults = this.allSearchResults.concat(res.data.list);
                        this.pageNumbersLoaded = page;
                    } else {
                        Logger.error('crproposal', 'can not get vote data!');
                    }
                }
                resolve(this.allSearchResults);
            }, (err) => {
                Logger.error('crproposal', 'fetchProposals error:', err);
                reject(err);
            });
        });
    }

    public fetchProposalDetails(proposalId: number): Promise<ProposalDetails> {
        return new Promise((resolve, reject) => {
            Logger.log('crproposal', 'Fetching proposal details for proposal ' + proposalId + '...');
            this.http.get<any>(this.cr_rpc_api + '/api/cvote/get_proposal/' + proposalId).subscribe((res: ProposalsDetailsResponse) => {
                Logger.log('crproposal', res);
                if (res && res.data) {
                    resolve(res.data);
                } else {
                    Logger.error('crproposal', 'cat not get data');
                    reject(null);
                }
            }, (err) => {
                Logger.error('crproposal', 'fetchProposalDetails error:', err);
                reject(err);
            });
        });
    }

    public fetchSearchedProposal(page = 1, status: ProposalStatus, search?: string): Promise<ProposalSearchResult[]> {
        return new Promise((resolve, reject) => {
            Logger.log('crproposal', 'Fetching searched proposal for status: ' + status, + 'with search: ' + search);
            this.http.get<any>(this.cr_rpc_api + '/api/cvote/all_search?page=' + page + '&results=10&status=' + status + '&search=' + search).subscribe((res: ProposalsSearchResponse) => {
                Logger.log('crproposal', res);
                if (res && res.data) {
                    resolve(res.data.list);
                } else {
                    reject(null);
                }
            }, (err) => {
                Logger.error('crproposal', 'fetchSearchedProposal error:', err);
                reject(err);
            });
        });
    }

    public fetchSuggestionDetails(suggestionId: string): Promise<SuggestionDetails> {
        return new Promise((resolve, reject) => {
            Logger.log('crproposal', 'Fetching suggestion details for suggestion ' + suggestionId + '...');
            this.http.get<any>(this.cr_rpc_api + '/api/suggestion/get_suggestion/' + suggestionId).subscribe((res: SuggestionDetailsResponse) => {
                Logger.log('crproposal', res);
                if (res && res.data) {
                    resolve(res.data);
                } else {
                    Logger.error('crproposal', 'get_suggestion: can not get data!');
                    reject(null);
                }
            }, (err) => {
                Logger.error('crproposal', 'fetchSuggestionDetails error:', err);
                reject(err);
            });
        });
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

    public navigateToProposalDetailsPage(proposal: ProposalSearchResult) {
        void this.nav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/proposal-details", { state: { proposalId: proposal.id } });

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