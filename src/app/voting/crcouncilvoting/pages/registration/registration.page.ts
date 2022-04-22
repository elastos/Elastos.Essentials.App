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
import { CandidatesService } from '../../services/candidates.service';

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
    public originInfo: CandidateBaseInfo;
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
        public candidatesService: CandidatesService,
    ) {

    }

    ngOnInit() {
        Logger.log("CandidateRegistrationPage", "ngOnInit")
    }

    ionViewWillEnter() {
        Logger.log("CandidateRegistrationPage", this.voteService.masterWalletId);
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.candidateInfo = Util.clone(this.candidatesService.candidateInfo);

        switch (this.candidateInfo.state) {
            case 'Unregistered':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.register-header'));
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                this.originInfo = Util.clone(this.candidateInfo);
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.update-header'));
                break;
        }
    }

    checkValues() {
        Logger.log("CandidateRegistrationPage", "Candidate Info", this.candidateInfo);

        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');
        if (!this.candidateInfo.nickname || this.candidateInfo.nickname == "") {
            blankMsg = this.translate.instant('dposregistration.node-name') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.candidateInfo.url || this.candidateInfo.url == "") {
            blankMsg = this.translate.instant('dposregistration.node-url') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.candidateInfo.url.match("((http|https)://)(([a-zA-Z0-9._-]+.[a-zA-Z]{2,6})|([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}))(:[0-9]{1,4})*(/[a-zA-Z0-9&%_./-~-]*)?")) {
            formatWrong = this.translate.instant('dposregistration.node-url') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (!this.candidateInfo.location) {
            blankMsg = this.translate.instant('dposregistration.node-location') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        // if (this.originInfo == null) { // Create
        //     // Check the nickname whether used
        //     for (const dpos of this.nodesService.dposList) {
        //         if (dpos.nickname == this.candidateInfo.nickname) {
        //             this.globalNative.genericToast('dposregistration.text-dpos-name-already-used');
        //             return;
        //         }
        //     }
        // }
        // else { // Update
        //     // Check don't modify
        //     if (this.candidateInfo.nickname == this.originInfo.nickname
        //         && this.candidateInfo.location == this.originInfo.location
        //         && this.candidateInfo.url == this.originInfo.url
        //         && this.candidateInfo.nodepublickey == this.originInfo.nodepublickey) {
        //         this.globalNative.genericToast('dposregistration.text-dpos-info-dont-modify');
        //         return;
        //     }

        //     // Check the nickname whether used
        //     for (const dpos of this.nodesService.dposList) {
        //         if (dpos.nickname == this.candidateInfo.nickname && dpos.nickname != this.originInfo.nickname) {
        //             this.globalNative.genericToast('dposregistration.text-dpos-name-already-used');
        //             return;
        //         }
        //     }
        // }

        this.needConfirm = true;
    }

    async confirm() {
        if (this.candidateInfo.state == 'Unregistered') {
            await this.register();
        }
        else if (this.candidateInfo.state == 'Active') {
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
        try {
            const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.voteService.masterWalletId, StandardCoinName.ELA,
                this.candidateInfo.ownerpublickey, this.candidateInfo.did, this.candidateInfo.nickname, this.candidateInfo.url, this.candidateInfo.location);

            if (payload) {
                let signature = await this.candidatesService.getSignature(payload.Digest);
                if (signature) {
                    payload.Signature = signature;
                    Logger.log('CandidateRegistrationPage', 'generateCRInfoPayload', payload);
                    return payload;
                }
            }
        }
        catch (e) {

        }
        return null;
    }

    async register() {
        // //Check value
        // if (!await this.nodesService.checkBalanceForRegDposNode()) {
        //     return;
        // }

        let payload = await this.getCRInfoPayload();
        if (payload) {
            const rawTx = await this.voteService.sourceSubwallet.createRegisterCRTransaction(payload, this.depositAmount, "");
            await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
        }
    }

    async update() {
        Logger.log('CandidateRegistrationPage', 'Calling update()', this.candidateInfo);
        let payload = await this.getCRInfoPayload();
        if (payload) {
            const rawTx = await this.voteService.sourceSubwallet.createUpdateCRTransaction(payload, "");
            await this.voteService.signAndSendRawTransaction(rawTx);
        }
    }
}
