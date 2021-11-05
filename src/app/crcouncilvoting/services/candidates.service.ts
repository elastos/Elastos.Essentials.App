import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { DIDDocument } from 'src/app/model/did/diddocument.model';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { Candidate } from '../model/candidates.model';
import { Selected } from '../model/selected.model';

export type CRMemberInfo = {
    address: string,
    avatar: string,
    cid: string,
    depositAmount: "0"
    did: string,
    didName: string,
    dpospublickey: string,
    impeachmentRatio: number,
    impeachmentThroughVotes: number,
    impeachmentVotes: number,
    isSelf: boolean,
    location: number,
    status: string,
    term: any[],
    type: string,
}
@Injectable({
    providedIn: 'root'
})
export class CandidatesService {

    private elaRpcApi: string;
    private crRpcApi: string;

    constructor(
        private globalNav: GlobalNavService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
        private storage: GlobalStorageService,
        public translate: TranslateService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) {

    }

    /** Election **/
    public candidates: Candidate[] = [];
    public totalVotes = 0;
    public selectedCandidates: Selected[] = [];
    public crmembers: any[] = [];
    public selectedMember: CRMemberInfo;

    /** Election Results **/
    public councilTerm: any[] = [];
    public currentTermIndex: number = -1;
    public votingTermIndex: number = -1;

    // public council: CouncilMember[] = [];

    private subscription: Subscription = null;

    public isCRMember = false;

    public httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json',
        })
    };

    public avatarList = {
        "ioNZHmG9CpDvjEfpRNWU1vd8i1rSHzVGB2": "https://elanodes.com/wp-content/uploads/custom/images/SunnyFengHan.png",
        "iqHaEoHQNdsRBFHNXEoiwF8hMRAikgMuxS": "https://elanodes.com/wp-content/uploads/custom/images/DonaldBullers.png",
        "if4ApisvFmMQTsBBeibYj8RYY8T6zKU5v5": "https://elanodes.com/wp-content/uploads/custom/images/ElationStudios2.png",
        "idzud676zaw6hbSbvkfzKnZgWdK9Pj3w8T": "https://elanodes.com/wp-content/uploads/custom/images/MarkXing.png",
        "ipLeeiAP46JHN12sXAAr22oowHJ23x9FRM": "https://elanodes.com/wp-content/uploads/custom/images/BrittanyKaiser.png",
        "iaBNozEmoTkzeEAjrUJyZDtuX8HJHBhYtx": "https://elanodes.com/logos/Starfish.png",
        "ifFGHBuoAbT4Hk6uHn8vsQn5et7KExyMUZ": "https://elanodes.com/wp-content/uploads/custom/images/SjunSong.png",
        "icaVPz8nY7Y7LKjpJxmzWxCG5F3CEV6hnt": "https://elanodes.com/wp-content/uploads/custom/images/RebeccaZhu.png",
        "ioe6q6iXHvMEmdBEB4wpd1WGyrgEuttw93": "https://elanodes.com/wp-content/uploads/custom/images/TheStrawberryCouncil_1.png",
        "ianpxAxfvEwX2VrScpHgtBiUsSu2wcxj4B": "https://elanodes.com/wp-content/uploads/custom/images/ZhangFeng_2.png",
        "iXMsb6ippqkCHN3EeWc4QCA9ySnrSgLc4u": "https://elanodes.com/wp-content/uploads/custom/images/NiuJingyu.png",
        "iTN9V9kaBewdNE9aw7DfqHgRn6NcDj8HCf": "https://elanodes.com/wp-content/uploads/custom/images/Orchard1.png",
    }

    async init() {
        this.initData();
    }

    async initData() {
        this.elaRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        this.crRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);

        this.candidates = [];
        this.crmembers = [];
        this.selectedCandidates = [];
        this.selectedMember = null;

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

        this.crmembers = []

        const param = {
            method: 'listcurrentcrs',
            params: {
                state: "all"
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.elaRpcApi, param);
            if (!result || Util.isEmptyObject(result.crmembersinfo)) {
                return;
            }
            Logger.log(App.CRCOUNCIL_VOTING, "crmembersinfo:", result.crmembersinfo);
            this.crmembers = result.crmembersinfo;

            for (let member of this.crmembers) {
                if (!this.isCRMember && member.did == GlobalDIDSessionsService.signedInDIDString) {
                    this.isCRMember = true;
                }
                member.avatar = await this.getAvatar(member.did);
            }
        }
        catch (err) {
            Logger.error('crcouncil', 'fetchCandidates error', err);
            await this.alertErr('crcouncilvoting.cr-member-info-no-available');
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

    async fetchCandidates() {
        Logger.log('crcouncil', 'Fetching Candidates..');
        const param = {
            method: 'listcrcandidates',
            params: {
                state: "active"
            },
        };

        this.candidates = [];
        try {
            const result = await this.jsonRPCService.httpPost(this.elaRpcApi, param);
            Logger.log('crcouncil', 'Candidates fetched', result);
            if (result && result.crcandidatesinfo) {
                this.candidates = result.crcandidatesinfo;
                Logger.log('crcouncil', 'Candidates added', this.candidates);
                this.totalVotes = parseFloat(result.totalvotes);
                for (let candidate of this.candidates) {
                    candidate.imageUrl = await this.getAvatar(candidate.did);
                }
            }
        }
        catch (err) {
            Logger.error('crcouncil', 'fetchCandidates error', err);
        }

        if (this.candidates.length < 1) {
            await this.fetchElectionResults();
        }
    }

    async fetchElectionResults() {
        await this.fetchCouncilTerm();
        this.fetchCRMembers();
    }

    async fetchCouncilTerm() {
        try {
            let result = await this.jsonRPCService.httpGet(this.crRpcApi + "/api/council/term");
            Logger.log('crcouncil', 'Council terms fetched', result);
            if (result && result.data) {
                this.councilTerm = result.data;
                for (var i = 0; i < this.councilTerm.length; i ++) {
                    if (this.councilTerm[i]) {
                        if (this.councilTerm[i].status == "CURRENT") {
                            this.currentTermIndex = i;
                        }
                        else if (this.councilTerm[i].status == "VOTING") {
                            this.votingTermIndex = i;
                        }
                    }
                }
            }
            else {
                Logger.error('crcouncil', 'can not get council term data!');
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'fetchCouncilTerm error:', err);
        }
    }

    // async fetchCurrentCRMembers() {
    //     this.crmembers = [];

    //     try {
    //         let result = await this.jsonRPCService.httpGet(this.crRpcApi + "/api/council/list/" + this.currentTermIndex);
    //         Logger.log(App.CRCOUNCIL_VOTING, 'Fetching Current CRMembers:', result);
    //         if (result && result.data && result.data.council) {
    //             this.crmembers = result.data.council;
    //             for (let member of this.crmembers) {
    //                 if (!member.avatar) {
    //                     member.avatar = await this.getAvatar(member.did);
    //                 }
    //             }
    //         }
    //     }
    //     catch (err) {
    //         Logger.error(App.CRCOUNCIL_VOTING, 'fetchCouncilTerm error:', err);
    //     }
    // }

    public async getAvatar(didString: string): Promise<string> {
        if (this.avatarList[didString]) {
            return this.avatarList[didString];
        }

        let ret = this.getAvatarFromDIDDocument(didString);
        if (ret != null) {
            return ret;
        }

        return "/assets/crcouncilvoting/icon/avatar.png";
    }

    public async getAvatarFromDIDDocument(didString: string): Promise<string> {
        let doc = await DIDDocument.getDIDDocumentFromDIDString(didString);
        if (doc != null) {
            let ret = doc.getAvatar();
            if (ret != null) {
                return ret;
            }
        }

        return null;
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

    async getCRMemeberInfo(did: string) {
        try {
            this.selectedMember = null;
            let result = await this.jsonRPCService.httpGet(this.crRpcApi + '/api/council/information/' + did);
            if (result && result.data) {
                let member = result.data;
                member.avatar = await this.getAvatar(member.did);
                member.isSelf = member.did == GlobalDIDSessionsService.signedInDIDString;
                this.selectedMember = member as CRMemberInfo;
                Logger.log(App.CRCOUNCIL_VOTING, 'Selected CRMembers:', member);
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'Get council information error:', err);
        }
    }

}
