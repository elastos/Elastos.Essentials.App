import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
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
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { DPoSRegistrationInfo, NodesService } from 'src/app/dposvoting/services/nodes.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';

type DPoSTransactionInfo = {
    Status?: string;
    address?: string;
    time?: number;
    txid?: string;
    height?: number;
}

@Component({
    selector: 'app-unregistration',
    templateUrl: './unregistration.page.html',
    styleUrls: ['./unregistration.page.scss'],
})
export class DPosUnRegistrationPage implements OnInit {
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
    public elastosChainCode = StandardCoinName.ELA;

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
    private TRANSACTION_LIMIT = 50;// for rpc
    public transactionInfo: DPoSTransactionInfo = {
        time: 0,
        txid: "",
        height: 0,
    }
    public publishedTime: string = "";
    public confirmCount: number = -1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletManager,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        public walletRPCService: WalletJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        private globalNav: GlobalNavService,
        public nodesService: NodesService,
        private globalNative: GlobalNativeService,
    ) {

    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async ionViewWillEnter() {

        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = this.nodesService.dposInfo;
        if (this.nodesService.dposInfo.state = 'Pending') {
            await this.nodesService.fetchNodes();
            this.dposInfo = this.nodesService.dposInfo;
        }

        let depositAddress = await this.walletManager.spvBridge.getOwnerDepositAddress(this.masterWalletId, StandardCoinName.ELA);
        const txRawList = await this.walletRPCService.getTransactionsByAddress(StandardCoinName.ELA, [depositAddress],
            this.TRANSACTION_LIMIT);
        if (txRawList && txRawList.length > 0) {
            this.transactionInfo = txRawList[0].result.txhistory[0] as DPoSTransactionInfo;
            // this.publishedTime = (new Date(this.transactionInfo.time * 1000)).toLocaleString();
            this.publishedTime = Util.timestampToDateTime(this.transactionInfo.time * 1000);
            Logger.log(App.DPOS_REGISTRATION, "transactionInfo:", this.transactionInfo);
        }

        switch (this.dposInfo.state) {

            // Pending indicates the producer is just registered and didn't get 6
            // confirmations yet.
            case 'Pending':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                this.confirmCount = await this.nodesService.getConfirmCount(this.transactionInfo.txid);
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.EDIT }); // Replace ela logo with close icon
                    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
                        await this.goToUpdate();
                });
                break;

            // Inactive indicates the producer has been inactivated for a period which shall
            // be punished and will be activated later.
            case 'Inactive':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
            // Canceled indicates the producer was canceled.
            case 'Canceled':
                this.titleBar.setTitle(this.translate.instant('dposregistration.retrieve'));

                this.blockHeight = await this.walletRPCService.getBlockCount(StandardCoinName.ELA);
                this.cancelHeight = this.dposInfo.cancelheight;
                this.getDepositcoin();
                break;
            // Illegal indicates the producer was found to break the consensus.
            case 'Illegal':
                this.titleBar.setTitle(this.translate.instant('dposregistration.illegal'));
                break;
            // Returned indicates the producer has canceled and deposit returned.
            case 'Returned':
                this.titleBar.setTitle(this.translate.instant('dposregistration.return'));
                break;
        }
    }

    async goToUpdate() {
        if (!this.nodesService.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposregistration.text-update-no-confirm');
            return;
        }

        this.globalNav.navigateTo(App.DPOS_VOTING, '/dposregistration/registration');
    }

    async getDepositcoin() {
        const param = {
            method: 'getdepositcoin',
            params: {
                ownerpublickey: this.dposInfo.ownerpublickey,
            },
        };
        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.jsonRPCService.httpPost(rpcApiUrl, param);
        Logger.log(App.DPOS_REGISTRATION, "getdepositcoin:", result);
        if (!Util.isEmptyObject(result.available)) {
            this.available = result.available;
            Logger.log(App.DPOS_REGISTRATION, "available:", this.available);
        }
    }

    async unregister() {
        Logger.log(App.DPOS_REGISTRATION, 'Calling createUnregisterDPoSTransaction()');

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposregistration.dpos-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateCancelProducerPayload(this.masterWalletId, StandardCoinName.ELA,
            this.dposInfo.ownerpublickey, payPassword);

        const rawTx = await this.voteService.sourceSubwallet.createCancelProducerTransaction(payload, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS_VOTING);
    }

    async retrieve() {
        Logger.log('wallet', 'Calling retrieve()', this.dposInfo);

        let depositAddress = await this.walletManager.spvBridge.getOwnerDepositAddress(this.masterWalletId, StandardCoinName.ELA);
        let utxoArray = await this.walletRPCService.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
        Logger.log(App.DPOS_REGISTRATION, "utxoArray:", utxoArray);

        let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

        const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction(utxo, this.available, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS_VOTING);
    }

}
