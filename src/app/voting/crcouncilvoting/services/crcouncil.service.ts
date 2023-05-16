import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { DIDDocument } from 'src/app/model/did/diddocument.model';
import { Util } from 'src/app/model/util';
import { GlobalDIDService } from 'src/app/services/global.did.service';
import { ElastosApiUrlType, GlobalElastosAPIService, ImageInfo } from 'src/app/services/global.elastosapi.service';
import { GlobalHiveCacheService } from 'src/app/services/global.hivecache.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { RawTransactionType, TransactionStatus, Utxo, UtxoType } from 'src/app/wallet/model/tx-providers/transaction.types';
import { VoteService } from '../../services/vote.service';
import { Candidate, CandidateBaseInfo } from '../model/candidates.model';
import { SelectedCandidate } from '../model/selected.model';
import { DIDSessionsStore } from './../../../services/stores/didsessions.store';

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

    nickname: string,
    url: string,
}
@Injectable({
    providedIn: 'root'
})
export class CRCouncilService {
    public isVoting = false;
    public inClaiming = false;
    private getCRVotingStageTimeout: NodeJS.Timeout = null;

    constructor(
        private globalNav: GlobalNavService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
        private storage: GlobalStorageService,
        public translate: TranslateService,
        public jsonRPCService: GlobalJsonRPCService,
        public voteService: VoteService,
        private globalIntentService: GlobalIntentService,
        public globalPopupService: GlobalPopupService,
        private globalNative: GlobalNativeService,
        private globalDidService: GlobalDIDService,
        private globalHiveCacheService: GlobalHiveCacheService,
        private theme: GlobalThemeService
    ) {
    }

    /** Election **/
    public candidates: Candidate[] = [];
    public originCandidates: Candidate[] = [];
    public totalVotes = 0;
    public selectedCandidates: SelectedCandidate[] = [];
    public crmembers: any[] = [];
    public selectedMember: CRMemberInfo;
    public selectedMemberDid: string;
    public candidateInfo: CandidateBaseInfo;
    public crmemberInfo: CRMemberInfo;
    public updateInfo: any;
    public secretaryGeneralInfo: any = null;

    /** Election Results **/
    public councilTerm: any[] = [];
    public currentTermIndex = -1;
    public votingTermIndex = -1;

    public nextCRs: any[] = [];
    public nextCRInfo: any;

    public isCRMember = false;
    public isCandidate = false;
    public isElected = false;

    // Image
    private logoUrl = 'https://api.elastos.io/images/';
    private nodeImages: ImageInfo[] = [];

    public httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json',
        })
    };

    init() {
        return this.initData();
    }

    initData() {
        this.candidates = [];
        this.selectedCandidates = [];
        this.selectedMember = null;
        this.isVoting = false;
    }

    async fetchCRMembers() {
        // Already fetched
        if (this.crmembers.length) return;

        Logger.log(App.CRCOUNCIL_VOTING, 'Fetching CRMembers..');

        if (this.nodeImages.length == 0) {
            await this.fetchNodeAvatars();
        }

        this.crmembers = [];
        this.crmemberInfo = null;
        this.isCRMember = false;

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
                if (!this.isCRMember && Util.isSelfDid(member.did)) {
                    this.isCRMember = true;
                    this.crmemberInfo = member;
                }
                this.getAvatar(member);
            }

            // Get secretariat
            let resultFromCR = await this.jsonRPCService.httpGet(this.voteService.getCrRpcApi() + "/api/council/list");
            Logger.log(App.CRCOUNCIL_VOTING, "council list from CR:", result.data);
            for (let item of resultFromCR.data.secretariat) {
                if (item.status == 'CURRENT') {
                    this.getAvatar(item);
                    if (item.startDate) {
                        item.startDate = Util.timestampToDateTime(item.startDate * 1000);
                    }

                    this.secretaryGeneralInfo = item;
                    Logger.log(App.VOTING, 'secretaryGeneral:', item);
                }
            }
            // Get didName for crmembers
            // The data returned by rpc api listcurrentcrs does not contain the didName
            for (let item of resultFromCR.data.council) {
                let crmember = this.crmembers.find( cr => cr.did == item.did);
                if (crmember)
                    crmember.didName = item.didName;
            }
        }
        catch (err) {
            Logger.error('crcouncil', 'fetchCRMembers error', err);
            await this.alertErr('crcouncilvoting.cr-member-info-no-available');
        }
    }

    getAvatarFromMembers(did: string): string {
        for (let item of this.crmembers) {
            if (did == item.did) {
                return item.avatar;
            }
        }

        return null;
    }

    async getCRMemberInfo(did: string): Promise<CRMemberInfo> {
        try {
            this.selectedMember = null;
            let url = this.voteService.getCrRpcApi() + '/api/v2/council/information/' + did;
            let result = await this.jsonRPCService.httpGet(url);
            if (result && result.data && result.data.did) {
                let member = result.data;
                member.avatar = this.getAvatarFromMembers(member.did);
                member.isSelf = Util.isSelfDid(member.did);
                this.selectedMember = member as CRMemberInfo;
                Logger.log(App.CRCOUNCIL_VOTING, 'Selected CRMembers:', member);
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'Get council information error:', err);
        }

        return this.selectedMember;
    }

    async getSecretary(): Promise<any> {
        return this.secretaryGeneralInfo;
    }

    async getSelectedCandidates(): Promise<any> {
        let data = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'crcouncil', this.voteService.masterWalletId + 'votes', []);
        Logger.log('crcouncil', 'Selected Candidates', data);
        return data;
    }

    async setSelectedCandidates(selectedCandidates: SelectedCandidate[]): Promise<any> {
        return await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'crcouncil', this.voteService.masterWalletId + 'votes', selectedCandidates);
    }

    async fetchCandidates() {
        if (this.nodeImages.length == 0) {
            await this.fetchNodeAvatars();
        }

        let selectedCandidates = await this.getSelectedCandidates();

        Logger.log('crcouncil', 'Fetching Candidates..');
        const param = {
            method: 'listcrcandidates',
            params: {
                state: "all"
            },
        };

        this.candidateInfo = {
            nickname: "",
            location: 0,
            url: '',
            state: "Unregistered",
        };

        this.candidates = [];
        this.originCandidates = [];
        this.selectedCandidates = []
        try {
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
            Logger.log('crcouncil', 'Candidates fetched', result);
            if (result && result.crcandidatesinfo) {
                for (let candidate of result.crcandidatesinfo) {
                    if (candidate.state == "Active") {
                        this.candidates.push(candidate);
                        this.getAvatar(candidate);

                        if (selectedCandidates) {
                            for (let selected of selectedCandidates) {
                                if (selected.cid === candidate.cid) {
                                    this.selectedCandidates.push(selected);
                                }
                            }
                        }
                    }
                    if (Util.isSelfDid(candidate.did)) {
                        this.isCandidate = true;
                        this.candidateInfo = candidate;
                        Logger.log('crcouncil', 'my candidate info', this.candidateInfo);
                    }
                }
                Logger.log('crcouncil', 'Candidates added', this.candidates);
                this.originCandidates = result.crcandidatesinfo;
                this.totalVotes = parseInt(result.totalvotes);
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

    async fetchNodeAvatars() {
        this.logoUrl = GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.IMAGES) + '/';
        try {
            let result = await GlobalElastosAPIService.instance.fetchImages();
            if (result) {
              this.nodeImages = result;
            }
        } catch (err) {
            Logger.error('crcouncil', 'fetchNodeAvatars error:', err);
        }
    }

    public async getAvatarFromHive(item: any) {
        let doc = await DIDDocument.getDIDDocumentFromDIDString(item.did);
        let hiveIconUrl = doc.getHiveIconUrl();
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.globalHiveCacheService.getAssetByUrl(hiveIconUrl, hiveIconUrl).subscribe(async iconBuffer => {
            if (iconBuffer) {
                item.avatar = await rawImageToBase64DataUrl(iconBuffer);
            }
        });
    }

    public getAvatar(item: any) {
        if (item.avatar) {
            return;
        }

        if (this.nodeImages[item.did]) {
            item.avatar = this.logoUrl + this.nodeImages[item.did].logo;
        }

        this.globalDidService.fetchUserInformation(item.did).subscribe(userInfo => {
            if (userInfo && userInfo.avatarDataUrl) {
                item.avatar = userInfo.avatarDataUrl;
            }
        });
        // void this.getAvatarFromHive(item);
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
            this.isVoting = result.invoting || false;
            this.inClaiming = result.inClaiming || false;

            // let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
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
        // let reDigest = Util.reverseHexToBE(digest)
        let ret = await this.globalIntentService.sendIntent("https://did.web3essentials.io/signdigest", { data: digest });
        Logger.log(App.CRPROPOSAL_VOTING, "Got signed digest.", digest, ret);
        if (ret && ret.result && ret.result.signature) {
            return ret.result.signature;
        }

        return null;
    }

    async getRemainingTime(): Promise<string> {
        var ret;
        var remainingBlockCount = -1;

        let result = await this.getCRRelatedStage();
        if (result && result.invoting) {
            let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
            if (result.votingendheight > currentHeight) {
                let block_remain = result.votingendheight - currentHeight;
                remainingBlockCount = block_remain;
            }
        }

        if (remainingBlockCount > 0) {
            ret = this.voteService.getRemainingTimeString(remainingBlockCount);
        }
        return ret;
    }

    async addCandidateOperationIcon(darkMode: boolean, titleBar: TitleBarComponent, titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void) {
        if (this.candidateInfo.state == 'Active' || this.candidateInfo.state == 'Pending') {
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
                        this.updateInfo = this.candidateInfo;
                        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/update');
                        break;

                    case "cancel-registration":
                        void this.unregisterCandidate();
                        break;
                }
            });
        }
        else if (this.candidateInfo.state == 'Canceled') {
            let available = await this.getCRDepositcoinAvailable();
            if (available > 0) {
                titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: this.theme.darkMode ? '/assets/crcouncilvoting/icon/darkmode/withdraw.svg' : '/assets/crcouncilvoting/icon/withdraw.svg' });
                titleBar.addOnItemClickedListener(titleBarIconClickedListener = (icon) => {
                    void this.withdrawCandidate(available, '/crcouncilvoting/candidates');
                });
            }
        }
    }

    async unregisterCandidate() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Calling unregister()');

        if (!await this.voteService.checkPendingBalance()) {
            return;
        }

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        if (!await this.globalPopupService.ionicConfirm('common.warning', 'crcouncilvoting.candidate-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        try {
            let payload: any = this.voteService.sourceSubwallet.generateUnregisterCRPayload(this.candidateInfo.cid);
            if (payload) {
                let signature = await this.getSignature(payload.Digest);
                if (signature) {
                    payload.Signature = signature;

                    await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

                    Logger.log('RegisterUpdatePage', 'generateUnregisterCRPayload', payload);
                    const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");
                    await this.globalNative.hideLoading();

                    let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, "/crcouncilvoting/candidates");
                    if (ret) {
                        this.voteService.toastSuccessfully('crcouncilvoting.unregistration-candidate');
                    }
                }
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }
    }

    async withdrawCandidate(available: number, customRoute?: string) {
        Logger.log(App.CRCOUNCIL_VOTING, 'withdrawCandidate', available);

        if (!await this.voteService.isSamePublicKey()) {
            void this.globalPopupService.ionicAlert('common.warning', 'crcouncilvoting.use-registered-wallet');
            return;
        }

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        let msg = this.translate.instant('crcouncilvoting.candidate-withdraw-warning-pre') + available +
            this.translate.instant('crcouncilvoting.candidate-withdraw-warning-suf');
        if (!await this.globalPopupService.ionicConfirm('common.warning', msg, 'common.confirm', 'common.cancel')) {
            return;
        }

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            let depositAddress = await this.voteService.sourceSubwallet.getCRDepositAddress();
            let utxoArray = await GlobalElastosAPIService.instance.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
            Logger.log(App.CRCOUNCIL_VOTING, "utxoArray:", utxoArray);

            let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

            const rawTx = await this.voteService.sourceSubwallet.createRetrieveCRDepositTransaction(utxo, available, "");
            Logger.log(App.CRCOUNCIL_VOTING, 'rawTx', rawTx);
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, customRoute);
            if (ret) {
                this.voteService.toastSuccessfully('crcouncilvoting.withdraw');
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }
    }

    async getCRDepositcoin(): Promise<any> {
        Logger.log(App.CRCOUNCIL_VOTING, 'Get CR Depositcoin...', Util.getShortDidString());

        const param = {
            method: 'getcrdepositcoin',
            params: {
                id: Util.getShortDidString(),
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
            Logger.log(App.CRCOUNCIL_VOTING, 'getCRDepositcoin', result);
            return result;
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'getCRDepositcoin error', err);
        }

        return null;
    }

    async getCRDepositcoinAvailable(): Promise<number> {
        let result = await this.getCRDepositcoin();
        if (result && result.available) {
            let ret = Number(result.available);
            if (isNaN(ret)) {
                ret = 0;
            }
            return ret;
        }
        else {
            return 0;
        }
    }

    async fetchNextCRs() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Fetching next crs..');

        if (this.nodeImages.length == 0) {
            await this.fetchNodeAvatars();
        }

        this.nextCRs = [];
        this.isElected = false;

        const param = {
            method: 'listnextcrs',
            params: {
                state: "all"
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.voteService.getElaRpcApi(), param);
            Logger.log(App.CRCOUNCIL_VOTING, "next crs:", result);
            if (!result || Util.isEmptyObject(result.crmembersinfo)) {
                return;
            }

            this.nextCRs = result.crmembersinfo;

            for (let cr of this.nextCRs) {
                if (!this.isElected && Util.isSelfDid(cr.did)) {
                    this.isElected = true;
                    this.nextCRInfo = cr;
                }
                this.getAvatar(cr);
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'next crs error', err);
        }
    }
}
