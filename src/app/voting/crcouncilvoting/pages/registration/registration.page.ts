import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CandidateBaseInfo } from '../../model/candidates.model';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-registration',
    templateUrl: './registration.page.html',
    styleUrls: ['./registration.page.scss'],
})
export class CandidateRegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // public masterWalletId: string;
    public areaList = areaList;
    public candidateInfo: CandidateBaseInfo = {
        nickname: "",
        location: 0,
        url: '',
        state: "Unregistered",
    };
    public originInfo: CandidateBaseInfo = null;
    public state = "";
    public elastosChainCode = StandardCoinName.ELA;

    public ownerPublicKey: string;

    public blockHeight = 0;
    public cancelHeight = 0;
    public available = 0;

    transFunction: any;
    title = '';
    info = '';

    needConfirm = false;

    private depositAmount = 500000000000; // 5000 ELA
    private fee = 10000;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletService,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNative: GlobalNativeService,
        private globalIntentService: GlobalIntentService,
        public crCouncilService: CRCouncilService,
    ) {

    }

    ngOnInit() {
        Logger.log("CandidateRegistrationPage", "ngOnInit")
    }

    ionViewWillEnter() {
        Logger.log("CandidateRegistrationPage", this.voteService.masterWalletId);
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        switch (this.crCouncilService.candidateInfo.state) {
            case 'Unregistered':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.register-header'));
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
            case 'Pending':
                this.originInfo = Util.clone(this.crCouncilService.candidateInfo);
                if (this.candidateInfo.state == "Unregistered") {
                    this.candidateInfo = Util.clone(this.originInfo);
                }
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.update-header'));
                break;
        }
    }

    checkValues() {
        Logger.log("CandidateRegistrationPage", "Candidate Info", this.candidateInfo);

        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');
        if (!this.candidateInfo.nickname || this.candidateInfo.nickname == "") {
            blankMsg = this.translate.instant('crcouncilvoting.name') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.candidateInfo.url || this.candidateInfo.url == "") {
            blankMsg = this.translate.instant('crcouncilvoting.url') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.candidateInfo.url.match("((http|https)://)(([a-zA-Z0-9._-]+.[a-zA-Z]{2,6})|([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}))(:[0-9]{1,4})*(/[a-zA-Z0-9&%_./-~-]*)?")) {
            formatWrong = this.translate.instant('crcouncilvoting.url') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (!this.candidateInfo.location || this.areaList.indexOf(this.candidateInfo.location) == -1) {
            blankMsg = this.translate.instant('crcouncilvoting.location') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (this.originInfo == null) { // Create
            // Check the nickname whether used
            for (let candidate of this.crCouncilService.originCandidates) {
                if (candidate.nickname == this.candidateInfo.nickname) {
                    this.globalNative.genericToast('crcouncilvoting.text-candidate-name-already-used');
                    return;
                }
            }
        }
        else { // Update
            // Check don't modify
            if (this.candidateInfo.location == this.originInfo.location
                && this.candidateInfo.url == this.originInfo.url) {
                this.globalNative.genericToast('crcouncilvoting.text-candidate-info-dont-modify');
                return;
            }
        }

        this.needConfirm = true;
    }

    async confirm() {
        if (this.candidateInfo.state == 'Unregistered') {
            await this.register();
        }
        else {
            await this.update();
        }
    }

    async getCRInfoPayload(): Promise<string> {
        if (!this.candidateInfo.ownerpublickey) {
            this.candidateInfo.ownerpublickey = await Util.getSelfPublicKey();
        }

        if (!this.candidateInfo.did) {
            this.candidateInfo.did = Util.getShortDidString();
        }

        Logger.log('CandidateRegistrationPage', 'candidateInfo', this.candidateInfo);
        const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.voteService.masterWalletId, StandardCoinName.ELA,
            this.candidateInfo.ownerpublickey, this.candidateInfo.did, this.candidateInfo.nickname, this.candidateInfo.url, this.candidateInfo.location);

        if (payload) {
            let signature = await this.crCouncilService.getSignature(payload.Digest);
            if (signature) {
                payload.Signature = signature;
                Logger.log('CandidateRegistrationPage', 'generateCRInfoPayload', payload);
                return JSON.stringify(payload);
            }
        }

        return null;
    }

    async register() {
        // //Check value
        // if (!await this.nodesService.checkBalanceForRegDposNode()) {
        //     return;
        // }

        try {
            let payload = await this.getCRInfoPayload();
            if (payload) {
                const rawTx = await this.voteService.sourceSubwallet.createRegisterCRTransaction(payload, this.depositAmount, "");
                await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
    }

    async update() {
        Logger.log('CandidateRegistrationPage', 'Calling update()', this.candidateInfo);
        try {
            let payload = await this.getCRInfoPayload();
            if (payload) {
                const rawTx = await this.voteService.sourceSubwallet.createUpdateCRTransaction(payload, "");
                await this.voteService.signAndSendRawTransaction(rawTx);
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
    }
}
