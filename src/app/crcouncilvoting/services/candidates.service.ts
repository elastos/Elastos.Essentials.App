import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Candidate } from '../model/candidates.model';
import { AlertController, ToastController } from '@ionic/angular';
import { Selected } from '../model/selected.model';
import { CouncilMember } from '../model/council.model';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DIDDocument } from 'src/app/model/did/diddocument.model';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';

@Injectable({
    providedIn: 'root'
})
export class CandidatesService {

    constructor(
        private http: HttpClient,
        private globalNav: GlobalNavService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
        private storage: GlobalStorageService,
        public translate: TranslateService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) { }


    /** Election **/
    public candidates: Candidate[] = [];
    public totalVotes = 0;
    public selectedCandidates: Selected[] = [];
    public crmembers: any[] = [];

    /** Election Results **/
    public councilTerm: number;
    public council: CouncilMember[] = [];

    private subscription: Subscription = null;

    public httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json',
        })
    };

    public params = {
        "method": "listcrcandidates",
        "params": { "state": "active" }
    };

    async init() {
        this.initData();
    }

    async initData() {
        this.candidates = [];
        this.crmembers = [];
        this.council = [];
        this.selectedCandidates = [];

        this.fetchCandidates();
        this.getSelectedCandidates();
    }

    public stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    async fetchCRMembers() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Fetching CRMembers..');
        const param = {
            method: 'listcurrentcrs',
            params: {
                state: "all"
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        Logger.log(App.CRCOUNCIL_VOTING, "rpcApiUrl:", rpcApiUrl);
        const result = await this.jsonRPCService.httpPost(rpcApiUrl, param);
        if (!Util.isEmptyObject(result.crmembersinfo)) {
            Logger.log(App.CRCOUNCIL_VOTING, "crmembersinfo:", result.crmembersinfo);
            this.crmembers = result.crmembersinfo;
        }
    }

    async getSelectedCandidates() {
        await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', []).then(data => {
            Logger.log('crcouncil', 'Selected Candidates', data);
            if (data) {
                this.selectedCandidates = data;
            }
        });
    }

    fetchCandidates() {
        Logger.log('crcouncil', 'Fetching Candidates..');
        let elaRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.http.post<any>(elaRpcApi, this.params, this.httpOptions).subscribe(async (res) => {
            Logger.log('crcouncil', 'Candidates fetched', res);
            if (res && res.result && res.result.crcandidatesinfo) {
                this.candidates = res.result.crcandidatesinfo;
                Logger.log('crcouncil', 'Candidates added', this.candidates);
                this.totalVotes = parseFloat(res.result.totalvotes);
                for (let candidate of this.candidates) {
                    candidate.imageUrl = await this.getAvatar(candidate.did);
                }
            } else {
                void this.fetchElectionResults();
            }
        }, (err) => {
            Logger.error('crcouncil', 'fetchCandidates error', err);
            void this.alertErr('crcouncilvoting.cr-council-no-available');
        });
    }

    async fetchElectionResults() {
        await this.fetchCouncilTerm();
        this.fetchCouncil();
    }

    private getCRCouncilTermEndpoint(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC) + '/api/council/term';
    }

    private getCRCouncilListEndpoint(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC) + '/api/council/list';
    }

    fetchCouncilTerm() {
        return new Promise<void>((resolve, reject) => {
            this.http.get<any>(this.getCRCouncilTermEndpoint()).subscribe((res) => {
                Logger.log('crcouncil', 'Council terms fetched', res);
                if (res && res.data && res.data[0]) {
                    this.councilTerm = res.data[0].startDate;
                } else {
                    Logger.error('crcouncil', 'can not get council term data!');
                }
                resolve();
            }, (err) => {
                Logger.error('crcouncil', 'fetchCouncilTerm error:', err);
                resolve();
            });
        });
    }

    fetchCouncil() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.http.get<any>(this.getCRCouncilListEndpoint()).subscribe(async (res) => {
            Logger.log('crcouncil', 'Council fetched', res);
            if (res && res.data) {
                this.council = res.data.council;
                for (let member of this.council) {
                    member.avatar = await this.getAvatar(member.did);
                }
            } else {
                Logger.error('crcouncil', 'can not get council data!');
            }
        }, (err) => {
            void this.alertErr('crcouncilvoting.cr-council-no-available');
            Logger.error('crcouncil', 'fetchCouncil error:', err);
        });
    }

    public async getAvatar(didString: string): Promise<string> {
        let doc = await DIDDocument.getDIDDocumentFromDIDString(didString);
        if (doc == null) {
            return null;
        }

        return doc.getAvatar();
    }

    async alertErr(err: string) {
        const alert = await this.alertCtrl.create({
            mode: 'ios',
            header: this.translate.instant('common.error'),
            message: this.translate.instant(err),
            buttons: [
                {
                    text: this.translate.instant('common.ok'),
                    handler: () => {
                        void this.globalNav.navigateHome();
                    }
                }
            ]
        });

        await alert.present();
    }

    async votingEndedToast() {
        const toast = await this.toastCtrl.create({
            mode: 'ios',
            position: 'bottom',
            color: 'primary',
            header: this.translate.instant('crcouncilvoting.cr-voting-ended'),
            message: this.translate.instant('crcouncilvoting.cr-voting-ended-message'),
            duration: 6000
        });

        await toast.present();
    }

}
