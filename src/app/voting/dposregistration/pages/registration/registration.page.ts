import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DPoSRegistrationInfo, NodesService } from 'src/app/voting/dposvoting/services/nodes.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

@Component({
    selector: 'app-registration',
    templateUrl: './registration.page.html',
    styleUrls: ['./registration.page.scss'],
})
export class DPosRegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList;
    public dposInfo: DPoSRegistrationInfo = {
        nickname: "",
        location: 0,
        url: '',
        state: "Unregistered",
    };
    public originInfo: DPoSRegistrationInfo;
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

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletService,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        public nodesService: NodesService,
        private globalNative: GlobalNativeService,
    ) {

    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    ionViewWillEnter() {
        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = Util.clone(this.nodesService.dposInfo);

        switch (this.dposInfo.state) {
            case 'Unregistered':
                this.originInfo = null;
                this.titleBar.setTitle(this.translate.instant('dposregistration.registration'));
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                this.originInfo = Util.clone(this.dposInfo);
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
        }
    }

    checkValues() {
        Logger.log("DPosRegistrationPage", "Dpos Info", this.dposInfo);

        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');
        if (!this.dposInfo.nickname || this.dposInfo.nickname == "") {
            blankMsg = this.translate.instant('dposregistration.node-name') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.dposInfo.nodepublickey || this.dposInfo.nodepublickey == "") {
            blankMsg = this.translate.instant('dposregistration.node-publickey') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.dposInfo.nodepublickey.match("^[A-Fa-f0-9]+$") || this.dposInfo.nodepublickey.length != 66
            || !(this.dposInfo.nodepublickey.startsWith("02") || this.dposInfo.nodepublickey.startsWith("03"))) {
            formatWrong = this.translate.instant('dposregistration.node-publickey') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (!this.dposInfo.url || this.dposInfo.url == "") {
            blankMsg = this.translate.instant('dposregistration.node-url') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.dposInfo.url.match("((http|https)://)(([a-zA-Z0-9\._-]+\.[a-zA-Z]{2,6})|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,4})*(/[a-zA-Z0-9\&%_\./-~-]*)?")) {
            formatWrong = this.translate.instant('dposregistration.node-url') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (!this.dposInfo.location) {
            blankMsg = this.translate.instant('dposregistration.node-location') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (this.originInfo == null) { // Create
            // Check the nickname whether used
            for (const dpos of this.nodesService.dposList) {
                if (dpos.nickname == this.dposInfo.nickname) {
                    this.globalNative.genericToast('dposregistration.text-dpos-name-already-used');
                    return;
                }
            }
        }
        else { // Update
            // Check don't modify
            if (this.dposInfo.nickname == this.originInfo.nickname
                && this.dposInfo.location == this.originInfo.location
                && this.dposInfo.url == this.originInfo.url
                && this.dposInfo.nodepublickey == this.originInfo.nodepublickey) {
                this.globalNative.genericToast('dposregistration.text-dpos-info-dont-modify');
                return;
            }

            // Check the nickname whether used
            for (const dpos of this.nodesService.dposList) {
                if (dpos.nickname == this.dposInfo.nickname && dpos.nickname != this.originInfo.nickname) {
                    this.globalNative.genericToast('dposregistration.text-dpos-name-already-used');
                    return;
                }
            }
        }

        this.needConfirm = true;
    }

    async confirm() {
        if (this.dposInfo.state == 'Unregistered') {
            await this.register();
        }
        else if (this.dposInfo.state == 'Active') {
            await this.update();
        }
    }

    async register() {
        Logger.log('dposregistration', 'Calling register()', this.dposInfo);

        //Check value
        if (!await this.nodesService.checkBalanceForRegDposNode()) {
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateProducerPayload(this.masterWalletId, StandardCoinName.ELA,
            this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createRegisterProducerTransaction(payload, this.voteService.depositAmount, "");

        let ret = await this.voteService.signAndSendRawTransaction(rawTx);
        if (ret) {
            this.voteService.toastSuccessfully('dposregistration.registration');
        }
    }

    async update() {
        Logger.log('dposregistration', 'Calling update()', this.dposInfo);

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateProducerPayload(this.masterWalletId, StandardCoinName.ELA,
            this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createUpdateProducerTransaction(payload, "");

        let ret = await this.voteService.signAndSendRawTransaction(rawTx);
        if (ret) {
            this.voteService.toastSuccessfully('dposregistration.update-header');
        }
    }

}
