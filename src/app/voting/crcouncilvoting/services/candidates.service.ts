import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { DIDDocument } from 'src/app/model/did/diddocument.model';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus } from 'src/app/wallet/model/providers/transaction.types';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { VoteService } from '../../services/vote.service';
import { Candidate, CandidateBaseInfo } from '../model/candidates.model';
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
    public isVoting = false;
    private getCRVotingStageTimeout: NodeJS.Timeout = null;

    constructor(
        private globalNav: GlobalNavService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
        private storage: GlobalStorageService,
        public translate: TranslateService,
        public jsonRPCService: GlobalJsonRPCService,
        public voteService: VoteService,
        private walletManager: WalletService,
        private globalIntentService: GlobalIntentService,
        public popupProvider: GlobalPopupService,
    ) {

    }

    /** Election **/
    public candidates: Candidate[] = [];
    public totalVotes = 0;
    public selectedCandidates: Selected[] = [];
    public crmembers: any[] = [];
    public selectedMember: CRMemberInfo;
    public candidateInfo: CandidateBaseInfo = {
        nickname: "test",
        location: 86,
        url: 'http://test.com',
        state: "Unregistered",
    };

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

    init() {
        return this.initData();
    }

    async initData() {
        this.candidates = [];
        this.crmembers = [];
        this.selectedCandidates = [];
        this.selectedMember = null;

        await this.fetchCandidates();
        await this.getSelectedCandidates();
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
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
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
                state: "all"
            },
        };

        this.candidates = [];
        try {
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
            Logger.log('crcouncil', 'Candidates fetched', result);
            if (result && result.crcandidatesinfo) {
                for (let candidate of result.crcandidatesinfo) {
                    if (candidate.state == "Active") {
                        this.candidates.push(candidate);
                        candidate.imageUrl = await this.getAvatar(candidate.did);
                    }
                    if (Util.isSelfDid(candidate.did)) {
                        this.candidateInfo = candidate;
                        Logger.log('crcouncil', 'my candidate info', this.candidateInfo);
                    }
                }
                Logger.log('crcouncil', 'Candidates added', this.candidates);
                this.totalVotes = parseFloat(result.totalvotes);
            }
        }
        catch (err) {
            Logger.error('crcouncil', 'fetchCandidates error', err);
        }

        this.candidateInfo.txConfirm = true;
        if (this.voteService.sourceSubwallet) {
            // TODO await this.voteService.sourceSubwallet.getTransactionsByRpc();
            let txhistory = await this.voteService.sourceSubwallet.getTransactions();
            for (let i in txhistory) {
                if (txhistory[i].Status !== TransactionStatus.CONFIRMED) {
                    if (this.candidateInfo.state == 'Unregistered') {
                        if (txhistory[i].txtype == RawTransactionType.RegisterCR) {
                            this.candidateInfo.txConfirm = false;
                            break;
                        }
                    }
                    else if (txhistory[i].txtype == RawTransactionType.UpdateCR) {
                        this.candidateInfo.txConfirm = false;
                        break;
                    }
                }
            }
        }

    }

    async fetchCouncilTerm() {
        try {
            let result = await this.jsonRPCService.httpGet(this.voteService.getCrRpcApi() + "/api/council/term");
            Logger.log('crcouncil', 'Council terms fetched', result);
            if (result && result.data) {
                this.councilTerm = result.data;
                for (var i = 0; i < this.councilTerm.length; i++) {
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

    public async getAvatar(didString: string): Promise<string> {
        if (this.avatarList[didString]) {
            return this.avatarList[didString];
        }

        let ret = await this.getAvatarFromDIDDocument(didString);
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

    async getCRMemeberInfo(did: string): Promise<CRMemberInfo> {
        try {
            this.selectedMember = null;
            let url = this.voteService.getCrRpcApi() + '/api/council/information/' + did;
            let result = await this.jsonRPCService.httpGet(url);
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

        return this.selectedMember;
    }

    async getCRRelatedStage(): Promise<any> {
        Logger.log(App.CRCOUNCIL_VOTING, 'Get CR Related Stage...');

        const param = {
            method: 'getcrrelatedstage',
            params: {
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
            Logger.log(App.CRCOUNCIL_VOTING, 'getCRRelatedStage', result);
            return result;
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'getCRRelatedStage error', err);
        }

        return null;
    }

    async getCRVotingStage() {
        let result = await this.getCRRelatedStage();
        if (result) {
            if (result.invoting) {
                this.isVoting = result.invoting;
            }
            else {
                this.isVoting = false;
            }

            // this.isVoting = !this.isVoting ;

            // let currentHeight = await this.voteService.getCurrentHeight();
            // var block_remain = 0;
            // if (this.isVoting && result.votingendheight > currentHeight) {
            //     block_remain = result.votingendheight - currentHeight;
            // }
            // else if (result.votingstartheight > currentHeight) {
            //     block_remain = result.votingstartheight - currentHeight;
            // }

            // if (block_remain < 1) {
            //     block_remain = 15; //30min
            // }

            // let time = block_remain * 2 * 60 * 1000; //ms
            // this.getCRVotingStageTimeout = setTimeout(() => {
            //     void this.getCRVotingStage();
            // }, time);
        }
    }

    stopTimeout() {
        if (this.getCRVotingStageTimeout) {
            clearTimeout(this.getCRVotingStageTimeout);
            this.getCRVotingStageTimeout = null;
        }
    }

    async getSignature(digest: string): Promise<string> {
        let reDigest = Util.reverseHexToBE(digest)
        let ret = await this.globalIntentService.sendIntent("https://did.elastos.net/signdigest", { data: reDigest });
        Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", reDigest, ret);
        if (ret && ret.result && ret.result.signature) {
            return ret.result.signature;
        }

        return null;
    }

    async getRemainingTime(): Promise<string> {
        var ret;
        var remainingTime = -1;

        let result = await this.getCRRelatedStage();
        if (result && result.invoting) {
            let currentHeight = await this.voteService.getCurrentHeight();

            if (result.votingendheight > currentHeight) {
                let block_remain = result.votingendheight - currentHeight;
                remainingTime = block_remain * 2;
            }
        }

        if (remainingTime > 0) {
            ret = this.voteService.getRemainingTimeString(remainingTime);
        }
        return ret;
    }

    addCandidateOperationIcon(darkMode: boolean, titleBar: TitleBarComponent, titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void) {
        if (this.candidateInfo.state == 'Active') {
            titleBar.setMenuVisibility(true);
            titleBar.setupMenuItems([
                {
                    key: "edit-candidate",
                    iconPath: !darkMode ? '/assets/crcouncilvoting/icon/edit-candidate.svg' : '/assets/crcouncilvoting/icon/darkmode/edit-candidate.svg',
                    title: "crcouncilvoting.edit-candidate"
                },
                {
                    key: "cancel-registration",
                    iconPath: !darkMode ? '/assets/crcouncilvoting/icon/unregister-candidate.svg' : '/assets/crcouncilvoting/icon/darkmode/unregister-candidate.svg',
                    title: "crcouncilvoting.unregistration-candidate"
                }
            ], "crcouncilvoting.manage-candidate");

            titleBar.addOnItemClickedListener(titleBarIconClickedListener = item => {
                switch (item.key) {
                    case "edit-candidate":
                        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
                        break;

                    case "cancel-registration":
                        void this.unregisterCandidate();
                        break;
                }
            });
        }
        else if (this.candidateInfo.state == 'Canceled') {
            //TODO:: the icon should be modify
            titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.DELETE });
            titleBar.addOnItemClickedListener(titleBarIconClickedListener = (icon) => {
                void this.withdrawCandidate();
            });
        }
    }

    async unregisterCandidate() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Calling unregister()');

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'crcouncilvoting.candidate-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        try {
            let payloadString = await this.walletManager.spvBridge.generateUnregisterCRPayload(
                this.voteService.masterWalletId, StandardCoinName.ELA, this.candidateInfo.cid);
            if (payloadString) {
                let payload = JSON.parse(payloadString);
                let signature = await this.getSignature(payload.Digest);
                if (signature) {
                    payload.Signature = signature;
                    Logger.log('CandidateRegistrationPage', 'generateUnregisterCRPayload', payload);
                    const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");
                    await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
                }
            }
        }
        catch (e) {

        }
    }

    withdrawCandidate() {

    }

}
