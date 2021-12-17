import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
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
    public blockWaitingDict = {};

    constructor(
        private http: HttpClient,
        private nav: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) {
    }

    init() {

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
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=10';
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, "fetchSuggestions", url, result);
            if (this.pageNumbersLoaded < page) {
                if (result && result.data && result.data.suggestions) {
                    this.allSearchResults = this.allSearchResults.concat(result.data.suggestions);
                    this.pageNumbersLoaded = page;
                }
                else {
                    Logger.error(App.CRSUGGESTION, 'fetchSuggestions can not get suggestions!');
                }
            }
            return this.allSearchResults;
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'fetchSuggestions error:', err);
        }
    }

    public async fetchSuggestionDetail(suggestionId: string): Promise<SuggestionDetail> {
        try {
            Logger.log(App.CRSUGGESTION, 'Fetching suggestion details for suggestion ' + suggestionId + '...');
            let url = this.getCrRpcApi() + '/api/v2/suggestion/get_suggestion/' + suggestionId;
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, result);
            if (result && result.data) {
                let detail = result.data;
                if ((detail.budgets.length > 0) && (detail.budgets[0].stage == 0)) {
                    detail.stageAdjust = 1;
                }
                else {
                    detail.stageAdjust = 0;
                }
                return result.data;
            }
            else {
                Logger.error(App.CRSUGGESTION, 'cat not get data');
            }
        }
        catch (err) {
            Logger.error(App.CRSUGGESTION, 'fetchSuggestionDetail error:', err);
        }
    }

    public async fetchSearchedSuggestion(page = 1, status: SuggestionStatus, search?: string): Promise<SuggestionSearchResult[]> {

        try {
            var url = this.getCrRpcApi() + '/api/v2/suggestion/all_search?page=' + page + '&results=10&search=' + search;
            if (status != SuggestionStatus.ALL) {
                url = url + '&status=' + status;
            }
            let result = await this.jsonRPCService.httpGet(url);
            Logger.log(App.CRSUGGESTION, 'fetchSearchedSuggestion:' + result);
            if (result && result.data) {
                return result.data.suggestions;
            }
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
}