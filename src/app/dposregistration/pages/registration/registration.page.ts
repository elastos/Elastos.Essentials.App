import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { areaList } from 'src/app/model/area.list';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import BigNumber from 'bignumber.js';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { WalletJsonRPCService } from 'src/app/wallet/services/jsonrpc.service';
import { Utxo, UtxoType } from 'src/app/wallet/model/Transaction';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { DPoSRegistrationInfo, NodesService } from 'src/app/dposvoting/services/nodes.service';

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
        nickname: "test",
        location: 86,
        url: 'http://test.com',
        state: "Unregistered",
    };
    public state: string = "";
    public chainId = StandardCoinName.ELA;
    public rpcApiUrl: string;

    public ownerPublicKey: string;

    public blockHeight = 0;
    public cancelHeight = 0;
    public available = 0;

    balance: BigNumber; // ELA

    transFunction: any;
    title = '';
    info = '';

    needConfirm = false;

    private depositAmount = 500000000000; // 5000 ELA

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletManager,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        public walletRPCService: WalletJsonRPCService,
        public nodesService: NodesService,
    ) {

    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    async ionViewWillEnter() {

        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = this.nodesService.dposInfo;

        switch (this.dposInfo.state) {
            case 'Unregistered':
                this.titleBar.setTitle(this.translate.instant('dposregistration.registration'));
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
        }
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

        this.balance = this.voteService.masterWallet.getSubWalletBalance(this.chainId);

        //Check value
        if (this.balance.lt(0.0002)) {
            this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateProducerPayload(this.masterWalletId, StandardCoinName.ELA,
            this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createRegisterProducerTransaction(payload, this.depositAmount, "");

        await this.voteService.signAndSendRawTransaction(rawTx);
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

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

}
