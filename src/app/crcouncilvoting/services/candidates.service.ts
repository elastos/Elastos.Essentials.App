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
import { NetworkType } from 'src/app/model/networktype';
import { Subscription } from 'rxjs';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { TranslateService } from '@ngx-translate/core';
import { DIDDocument } from 'src/app/model/did/diddocument.model';

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
        private globalPreferences: GlobalPreferencesService,
        public translate: TranslateService
    ) { }


    /** Election **/
    public candidates: Candidate[] = [];
    public totalVotes: number = 0;
    public selectedCandidates: Selected[] = [];

    /** Election Results **/
    public councilTerm: number;
    public council: CouncilMember[] = [];

    // public activeNetwork: NetworkType;
    private subscription: Subscription = null;

    /** Http Url */
    private ela_rpc_api = 'https://api.elastos.io/ela';
    private cr_rpc_api = 'https://api.cyberrepublic.org';
    private cr_council_term = 'https://api.cyberrepublic.org/api/council/term';
    private cr_council_list = 'https://api.cyberrepublic.org/api/council/list/1';

    // cors-anywhere: CORS Anywhere is a NodeJS proxy which adds CORS headers to the proxied request.
    private proxyurl = "https://sheltered-wave-29419.herokuapp.com/";
    // private proxyurl = "";

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
        // this.activeNetwork = await this.globalPreferences.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);
        this.subscription = this.globalPreferences.preferenceListener.subscribe(async (preference) => {
            if (preference.key === "chain.network.type") {
                // this.activeNetwork = preference.value;
                await this.setupUrl();
                this.ininData();
            }
        });
        await this.setupUrl();
        this.ininData();
    }

    async ininData() {
        this.candidates = [];
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

    async setupUrl() {
        // if (this.activeNetwork === NetworkType.LrwNet) {
        // this.proxyurl = "https://sheltered-wave-29419.herokuapp.com/";
        // } else {
        // this.proxyurl = '';
        // }
        this.ela_rpc_api = await this.globalPreferences.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'mainchain.rpcapi');
        this.cr_rpc_api = await this.globalPreferences.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'cr.rpcapi');
        this.cr_council_term = this.cr_rpc_api + '/api/council/term';
        this.cr_council_list = this.cr_rpc_api + '/api/council/list/1';
        Logger.log('crcouncil', 'setupUrl:', this);
    }

    getSelectedCandidates() {
        this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', []).then(data => {
            Logger.log('crcouncil', 'Selected Candidates', data);
            if (data) {
                this.selectedCandidates = data;
            }
        });
    }

    fetchCandidates() {
        Logger.log('crcouncil', 'Fetching Candidates..');
        this.http.post<any>(this.proxyurl + this.ela_rpc_api, this.params, this.httpOptions).subscribe(async (res) => {
            Logger.log('crcouncil', 'Candidates fetched', res);
            if (res && res.result && res.result.crcandidatesinfo) {
                this.candidates = res.result.crcandidatesinfo;
                Logger.log('crcouncil', 'Candidates added', this.candidates);
                this.totalVotes = parseFloat(res.result.totalvotes);
                for (let candidate of this.candidates) {
                    candidate.imageUrl = await this.getAvatar(candidate.did);
                }
            } else {
                this.fetchElectionResults();
            }
        }, (err) => {
            Logger.error('crcouncil', 'fetchCandidates error', err);
            this.alertErr('crcouncilvoting.cr-council-no-available');
        });
    }

    async fetchElectionResults() {
        await this.fetchCouncilTerm();
        this.fetchCouncil();
    }

    fetchCouncilTerm() {
        return new Promise<void>((resolve, reject) => {
            this.http.get<any>(this.cr_council_term).subscribe((res) => {
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
        this.http.get<any>(this.cr_council_list).subscribe(async (res) => {
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
            this.alertErr('crcouncilvoting.cr-council-no-available');
            Logger.error('crcouncil', 'fetchCouncil error:', err);
        });
    }

    public async getAvatar(didString: string): Promise<string> {
        let doc = await DIDDocument.getDIDDocumentFromDIDString(didString);
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
                        this.globalNav.navigateHome();
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
