import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { SuggestionDetail, SuggestionSearchResult, SuggestionStatus } from '../model/suggestion-model';

@Injectable({
    providedIn: 'root'
})
export class SuggestionService {
    public allSearchResults: SuggestionSearchResult[] = [];
    private pageNumbersLoaded = 0;
    private subscription: Subscription = null;
    public selectedSuggestion: SuggestionSearchResult;

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) {
    }

    public stop() {
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

    public async fetchSuggestions(status: SuggestionStatus, page: number): Promise<SuggestionSearchResult[]> {
        if (this.pageNumbersLoaded >= page) {
            return this.allSearchResults;
        }

        try {
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=40';
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log('crsuggestion', result);
            if (this.pageNumbersLoaded < page) {
                if (result && result.data && result.data.suggestions) {
                    this.allSearchResults = this.allSearchResults.concat(result.data.suggestions);
                    this.pageNumbersLoaded = page;
                }
                else {
                    Logger.error('crsuggestion', 'fetchSuggestions can not get vote data!');
                }
            }
            return this.allSearchResults;
        }
        catch (err) {
            Logger.error('crsuggestion', 'fetchSuggestions error:', err);
        }
    }

    public async fetchSuggestionDetail(suggestionId: string): Promise<SuggestionDetail> {
        try {
            Logger.log('crsuggestion', 'Fetching suggestion details for suggestion ' + suggestionId + '...');
            let url = this.getCrRpcApi() + '/api/v2/suggestion/get_suggestion/' + suggestionId;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log('crsuggestion', result);
            if (result && result.data) {
                return result.data;
            }
            else {
                Logger.error('crsuggestion', 'cat not get data');
            }
        }
        catch (err) {
            Logger.error('crsuggestion', 'fetchSuggestionDetail error:', err);
        }
    }

    public async fetchSearchedSuggestion(page = 1, status: SuggestionStatus, search?: string): Promise<SuggestionSearchResult[]> {

        try {
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=10&search=' + search;
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log('crsuggestion', 'fetchSearchedSuggestion:' + result);
            if (result && result.data) {
                return result.data.list;
            }
        }
        catch (err) {
            Logger.error('crsuggestion', 'fetchSearchedSuggestion error:', err);
        }
    }

    // /**
    //  * Returns a JWT result to a given callback url, as a response to a CR command/action.
    //  * Ex: scan "createsuggestion" qr code -> return the response to the callback.
    //  */
    // public sendSuggestionCommandResponseToCallbackURL(callbackUrl: string, jwtToken: string): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         Logger.log('crsuggestion', "Calling callback url: " + callbackUrl);

    //         let headers = new HttpHeaders({
    //             'Content-Type': 'application/json'
    //         });

    //         this.http.post<any>(callbackUrl, {
    //             jwt: jwtToken
    //         }, { headers: headers }).subscribe((res) => {
    //             Logger.log('crsuggestion', "Callback url response success", res);
    //             resolve();
    //         }, (err) => {
    //             Logger.error('crsuggestion', err);

    //             if (err.error && err.error.message)
    //                 reject(err.error.message); // Improved message
    //             else
    //                 reject(err); // Raw error
    //         });
    //     });
    // }

    public getFetchedSuggestionById(suggestionId: number): SuggestionSearchResult {
        return this.allSearchResults.find((suggestion) => {
            return suggestion.id == suggestionId;
        })
    }
}