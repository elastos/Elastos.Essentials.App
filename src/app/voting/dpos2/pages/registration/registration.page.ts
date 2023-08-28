import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { DPoS2RegistrationInfo, DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-registration',
    templateUrl: './registration.page.html',
    styleUrls: ['./registration.page.scss'],
})
export class DPoS2RegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList.filter(a => a != 1001);
    public dposInfo: DPoS2RegistrationInfo = {
        nickname: "",
        location: 0,
        stakeDays: 0,
        url: '',
        state: "Unregistered",
    };
    public originInfo: DPoS2RegistrationInfo;
    public state = "";
    public elastosChainCode = StandardCoinName.ELA;

    public ownerPublicKey: string;

    public blockHeight = 0;
    public cancelHeight = 0;
    public available = 0;

    transFunction: any;
    info = '';
    header = '';
    buttonLabel = '';

    needConfirm = false;
    onlyEditStakeUntil = false;

    public isExecuting = false;

    constructor(
        public uxService: UXService,
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        private authService: AuthService,
        public jsonRPCService: GlobalJsonRPCService,
        public dpos2Service: DPoS2Service,
        private globalNative: GlobalNativeService,
        public popupProvider: GlobalPopupService,
    ) {

    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    ionViewWillEnter() {
        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        // this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = Util.clone(this.dpos2Service.dposInfo);
        if (!this.dposInfo.url) {
            this.dposInfo.url ="https://"
        }

        switch (this.dposInfo.state) {
            case 'Unregistered':
                this.originInfo = null;
                this.dposInfo.stakeDays = 100;

                this.onlyEditStakeUntil = this.dposInfo.identity == "DPoSV1";
                if (this.dposInfo.identity == "DPoSV1") {
                    this.titleBar.setTitle(this.translate.instant('dposvoting.upgrade-to-2.0'));
                    this.header = this.translate.instant('dposvoting.upgrade-header');
                    this.buttonLabel = this.translate.instant('dposvoting.upgrade');
                }
                else {
                    this.titleBar.setTitle(this.translate.instant('dposvoting.registration'));
                    this.header = this.translate.instant('dposvoting.register-header');
                    this.buttonLabel = this.translate.instant('dposvoting.register');
                }

                Logger.log(App.DPOS2, 'Register node: ', this.dposInfo);
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
            case 'Inactive':
                this.originInfo = Util.clone(this.dposInfo);
                this.onlyEditStakeUntil = this.dpos2Service.onlyUpdateStakeUntil;
                this.titleBar.setTitle(this.translate.instant('dposvoting.dpos-node-info'));
                this.header = this.translate.instant('dposvoting.update-header');
                this.buttonLabel =  this.translate.instant('dposvoting.update');
                Logger.log(App.DPOS2, 'Update node: ', this.dposInfo);
                break;
        }
        this.dposInfo.inputStakeDays = this.dposInfo.stakeDays;
    }

    checkValues() {
        Logger.log(App.DPOS2, "Dpos Info", this.dposInfo);

        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');

        if (!this.onlyEditStakeUntil) {
            if (!this.dposInfo.nickname || this.dposInfo.nickname == "") {
                blankMsg = this.translate.instant('dposvoting.node-name') + blankMsg;
                this.globalNative.genericToast(blankMsg);
                return;
            }

            if (!this.dposInfo.nodepublickey || this.dposInfo.nodepublickey == "") {
                blankMsg = this.translate.instant('dposvoting.node-publickey') + blankMsg;
                this.globalNative.genericToast(blankMsg);
                return;
            }

            if (!this.dposInfo.nodepublickey.match("^[A-Fa-f0-9]+$") || this.dposInfo.nodepublickey.length != 66
                || !(this.dposInfo.nodepublickey.startsWith("02") || this.dposInfo.nodepublickey.startsWith("03"))) {
                formatWrong = this.translate.instant('dposvoting.node-publickey') + formatWrong;
                this.globalNative.genericToast(formatWrong);
                return;
            }

            if (!this.dposInfo.url || this.dposInfo.url == "") {
                blankMsg = this.translate.instant('dposvoting.node-url') + blankMsg;
                this.globalNative.genericToast(blankMsg);
                return;
            }

            if (!this.dposInfo.url.match("((http|https)://)(([a-zA-Z0-9\._-]+\.[a-zA-Z]{2,6})|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,4})*(/[a-zA-Z0-9\&%_\./-~-]*)?")) {
                formatWrong = this.translate.instant('dposvoting.node-url') + formatWrong;
                this.globalNative.genericToast(formatWrong);
                return;
            }

            if (!this.dposInfo.location) {
                blankMsg = this.translate.instant('dposvoting.node-location') + blankMsg;
                this.globalNative.genericToast(blankMsg);
                return;
            }
        }

        if (this.dposInfo.inputStakeDays < this.dposInfo.stakeDays) {
            formatWrong = this.translate.instant('dposvoting.stakedays-input-err', {days: this.dposInfo.stakeDays});
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (this.originInfo == null) { // Create
            // Check the nickname whether used
            for (const dpos of this.dpos2Service.dposList) {
                if (dpos.nickname == this.dposInfo.nickname) {
                    this.globalNative.genericToast('dposvoting.text-dpos-name-already-used');
                    return;
                }
            }
        }
        else { // Update
            // Check don't modify
            if (this.dposInfo.nickname == this.originInfo.nickname
                && this.dposInfo.location == this.originInfo.location
                && this.dposInfo.url == this.originInfo.url
                && this.dposInfo.inputStakeDays == this.originInfo.stakeDays
                && this.dposInfo.nodepublickey == this.originInfo.nodepublickey) {
                this.globalNative.genericToast('dposvoting.text-dpos-info-dont-modify');
                return;
            }

            // Check the nickname whether used
            for (const dpos of this.dpos2Service.dposList) {
                if (dpos.nickname == this.dposInfo.nickname && dpos.nickname != this.originInfo.nickname) {
                    this.globalNative.genericToast('dposvoting.text-dpos-name-already-used');
                    return;
                }
            }
        }

        this.needConfirm = true;
    }

    async confirm() {
        try {
            this.isExecuting = true;

            let showConfirmDialog = true;
            let confirmTitle = null;

            // update
            if (this.dposInfo.state == 'Active' || this.dposInfo.state == "Inactive") {
              if (this.dposInfo.inputStakeDays == this.originInfo.stakeDays) {
                showConfirmDialog = false;
              } else {
                confirmTitle = this.translate.instant('dposvoting.confirm-update-title')
              }
            } else {
              confirmTitle = this.translate.instant('dposvoting.registration-confirm-title')
            }

            if (showConfirmDialog) {
              let confirmed = await this.popupProvider.showConfirmationPopup(
                confirmTitle,
                this.translate.instant('dposvoting.registration-confirm-prompt', {days: this.dposInfo.inputStakeDays}),
                this.translate.instant('common.continue'), "/assets/identity/default/publishWarning.svg");
              if (!confirmed) {
                  return;
              }
            }

            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            if (this.dposInfo.state == 'Unregistered' && this.dposInfo.identity != "DPoSV1") {
                await this.register();
            }
            else {
                await this.update();
            }
        }
        finally {
            await this.globalNative.hideLoading();
            this.isExecuting = false;
        }
    }

    async register() {
        Logger.log(App.DPOS2, 'Calling register()', this.dposInfo);

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        //Check value
        if (!await this.dpos2Service.checkBalanceForRegDposNode()) {
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        try {
            let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
            let stakeUntil = currentHeight + this.dposInfo.inputStakeDays * 720;

            const payload = await this.voteService.sourceSubwallet.generateProducerPayload(
                this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword, stakeUntil);

            Logger.log(App.DPOS2, 'register payload:', payload);

            const rawTx = await this.voteService.sourceSubwallet.createRegisterProducerTransaction(payload, this.voteService.deposit2K, "");

            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('dposvoting.registration');
            }
        } catch (e) {
            await this.voteService.popupErrorMessage(e);
            this.needConfirm = false;
        }
    }

    async update() {
        Logger.log('dposregistration', 'Calling update()', this.dposInfo);

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }
        try {
            let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight();
            let stakeUntil = currentHeight + this.dposInfo.inputStakeDays * 720;
            const payload = await this.voteService.sourceSubwallet.generateProducerPayload(
                this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword, stakeUntil);

            Logger.log(App.DPOS2, 'Update node payload:', payload);
            const rawTx = await this.voteService.sourceSubwallet.createUpdateProducerTransaction(payload, "");
            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('dposvoting.node-update-toast');
            }
        } catch (e) {
            await this.voteService.popupErrorMessage(e);
            this.needConfirm = false;
        }
    }

}
