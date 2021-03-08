import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Config } from '../config/config';
import { ProposalStatus } from '../model/proposal-status';
import { ProposalsSearchResponse } from '../model/proposal-search-response';
import { ProposalSearchResult } from '../model/proposal-search-result';
import { Router } from '@angular/router';
import { ProposalDetails } from '../model/proposal-details';
import { ProposalsDetailsResponse } from '../model/proposal-details-response';
import { SuggestionDetails } from '../model/suggestion-details';
import { SuggestionDetailsResponse } from '../model/suggestion-details-response';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsModule } from 'src/app/didsessions/module';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

declare let appManager: AppManagerPlugin.AppManager;

@Injectable({
    providedIn: 'root'
})
export class ProposalService {
    private latestSearchResults: ProposalSearchResult[] = [];

    constructor(private http: HttpClient, private router: Router, private prefs: GlobalPreferencesService) {}

    private getCRProposalAPI(): Promise<string> {
		return new Promise(async (resolve)=>{
            let value = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, "chain.network.type");
            if (value == "MainNet")
                resolve(Config.CR_PROPOSAL_API_MAINNET);
            else if (value == "PrvNet")
                resolve(Config.CR_PROPOSAL_API_PRIVNET);
            else
                resolve(null);
        });
	}

    public async fetchProposals(status: ProposalStatus, page: number): Promise<ProposalsSearchResponse> {
        let apiUrl = await this.getCRProposalAPI();

        return new Promise((resolve, reject)=>{
            console.log('Fetching proposals...');
            this.http.get<any>(apiUrl+'/api/cvote/all_search?status='+status+'&page='+page+'&results=10').subscribe((res: ProposalsSearchResponse) => {
                console.log(res);
                this.latestSearchResults = res.data.list;
                resolve(res);
            }, (err) => {
                console.error(err);
                this.latestSearchResults = [];
                reject(err);
            });
        });
    }

    public async fetchProposalDetails(proposalId: number): Promise<ProposalDetails> {
        let apiUrl = await this.getCRProposalAPI();

        return new Promise((resolve, reject)=>{
            console.log('Fetching proposal details for proposal '+proposalId+'...');
            this.http.get<any>(apiUrl+'/api/cvote/get_proposal/'+proposalId).subscribe((res: ProposalsDetailsResponse) => {
                console.log(res);
                resolve(res.data);
            }, (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    public async fetchSearchedProposal(page: number = 1, status: ProposalStatus, search?: string): Promise<ProposalsSearchResponse> {
        let apiUrl = await this.getCRProposalAPI();

        return new Promise((resolve, reject)=>{
            console.log('Fetching searched proposal for status: ' + status, + 'with search: ' + search);
            this.http.get<any>(apiUrl+'/api/cvote/all_search?page='+page+'&results=10&status='+status+'&search='+search).subscribe((res: ProposalsSearchResponse) => {
                console.log(res);
                resolve(res);
            }, (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    public async fetchSuggestionDetails(suggestionId: string): Promise<SuggestionDetails> {
        let apiUrl = await this.getCRProposalAPI();

        return new Promise((resolve, reject)=>{
            console.log('Fetching suggestion details for suggestion '+suggestionId+'...');
            this.http.get<any>(apiUrl+'/api/suggestion/get_suggestion/'+suggestionId).subscribe((res: SuggestionDetailsResponse) => {
                console.log(res);
                resolve(res.data);
            }, (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    /**
     * Returns a JWT result to a given callback url, as a response to a CR command/action.
     * Ex: scan "createsuggestion" qr code -> return the response to the callback.
     */
    public sendProposalCommandResponseToCallbackURL(callbackUrl: string, jwtToken: string): Promise<void> {
        return new Promise((resolve, reject)=>{
            console.log("Calling callback url: "+callbackUrl);

            let headers = new HttpHeaders({
                'Content-Type': 'application/json'
            });

            this.http.post<any>(callbackUrl, {
                jwt: jwtToken
            }, { headers: headers }).subscribe((res) => {
                console.log("Callback url response success", res);
                resolve();
            }, (err) => {
                console.error(err);

                if (err.error && err.error.message)
                    reject(err.error.message); // Improved message
                else
                    reject(err); // Raw error
            });
        });
    }

    public navigateToProposalDetailsPage(proposal: ProposalSearchResult) {
        this.router.navigate(["/proposal-details"], {
            queryParams: {
                proposalId: proposal.id
            }
        })
    }

    public getFetchedProposalById(proposalId: number): ProposalSearchResult {
        return this.latestSearchResults.find((proposal)=>{
            return proposal.id == proposalId;
        })
    }
}