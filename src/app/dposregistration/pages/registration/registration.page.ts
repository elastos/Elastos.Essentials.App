import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { areaList } from 'src/app/model/area.list';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import BigNumber from 'bignumber.js';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';


type DPoSRegistrationInfo = {
    active?: boolean;
    cancelheight?: number;
    illegalheight?: number;
    inactiveheight?: number;
    index?: number;
    location: number;
    nickname: string;
    nodepublickey?: string;
    ownerpublickey?: string;
    registerheight?: 113;
    state: string;
    url: string;
    votes?: string;
}

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
        url:'http://test.com',
        state: "Unregistered",
    };
    public state:string = "";
    public chainId = StandardCoinName.ELA;

    public ownerPublicKey: string;

    balance: BigNumber; // ELA

    transFunction: any;
    title = '';
    info = '';

    private depositAmount = 500000000000; // 5000 ELA

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletManager,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
    ) {

    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    async ionViewWillEnter() {

        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);


        // this.crmemberInfo = null;
        const param = {
            method: 'listproducers',
            params: {
                state: "all"
            },
        };

        let rpcApiUrl = this.jsonRPCService.getRPCApiUrl(StandardCoinName.ELA);
        Logger.log(App.DPOS_REGISTRATION, "rpcApiUrl:", rpcApiUrl);
        const result = await this.jsonRPCService.httpRequest(rpcApiUrl, param);
        this.ownerPublicKey = await this.walletManager.spvBridge.getOwnerPublicKey(this.voteService.masterWalletId, StandardCoinName.ELA);
        if (!Util.isEmptyObject(result.producers)) {
            Logger.log(App.DPOS_REGISTRATION, "dposlist:", result.producers);
            for (const producer of result.producers) {
                if (producer.ownerpublickey.toLocaleLowerCase() == this.ownerPublicKey.toLocaleLowerCase()) {
                    this.state = producer.state;
                    this.dposInfo = producer;
                    break;
                }
            }
        }

        switch (this.dposInfo.state) {
            case 'Unregistered':
                this.titleBar.setTitle(this.translate.instant('dposregistration.registration'));
                this.dposInfo.nodepublickey = this.ownerPublicKey;
                this.dposInfo.ownerpublickey = this.ownerPublicKey;
                break;
            // Pending indicates the producer is just registered and didn't get 6
            // confirmations yet.
            case 'Pending':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
            this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;

            // Inactive indicates the producer has been inactivated for a period which shall
            // be punished and will be activated later.
            case 'Inactive':
            this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
            // Canceled indicates the producer was canceled.
            case 'Canceled':
                this.titleBar.setTitle(this.translate.instant('dposregistration.retrieve'));
                break;
            // Illegal indicates the producer was found to break the consensus.
            case 'Canceled':
                this.titleBar.setTitle(this.translate.instant('dposregistration.retrieve'));
                break;
            // Returned indicates the producer has canceled and deposit returned.
            case 'Returned':
                break;
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

    async unregister() {
        Logger.log('wallet', 'Calling createUnregisterDPoSTransaction()');

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateCancelProducerPayload(this.masterWalletId, StandardCoinName.ELA,
                this.dposInfo.ownerpublickey, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createCancelProducerTransaction(payload, "");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

    async update() {
        Logger.log('wallet', 'Calling update()', this.dposInfo);

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateProducerPayload(this.masterWalletId, StandardCoinName.ELA,
            this.dposInfo.ownerpublickey, this.dposInfo.nodepublickey, this.dposInfo.nickname, this.dposInfo.url, "", this.dposInfo.location, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createUpdateProducerTransaction(payload, "");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

    async retrieve() {
        Logger.log('wallet', 'Calling retrieve()', this.dposInfo);

        // let depositAddress = await this.walletManager.spvBridge.getDepositAddress(this.ownerPublicKey);
        //Utxo

        const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction("");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

}
