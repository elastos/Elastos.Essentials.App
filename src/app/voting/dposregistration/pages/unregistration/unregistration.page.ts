import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DPoSRegistrationInfo, NodesService } from 'src/app/voting/dposvoting/services/nodes.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { Utxo, UtxoType } from 'src/app/wallet/model/tx-providers/transaction.types';
import { AuthService } from 'src/app/wallet/services/auth.service';

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
        nickname: "",
        location: 0,
        url: '',
        state: "Unregistered",
    };
    public state = "";
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

    private TRANSACTION_LIMIT = 50;// for rpc
    public transactionInfo: DPoSTransactionInfo = {
        time: 0,
        txid: "",
        height: 0,
    }
    public publishedTime = "";
    public confirmCount = -1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        private authService: AuthService,
        private globalPopupService: GlobalPopupService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        private globalNav: GlobalNavService,
        public nodesService: NodesService,
        private globalNative: GlobalNativeService,
    ) {
    }

    ngOnInit() {
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async ionViewWillEnter() {
        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        // this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = this.nodesService.dposInfo;
        if (this.nodesService.dposInfo.state == 'Pending') {
            await this.nodesService.fetchNodes();
            this.dposInfo = this.nodesService.dposInfo;
        }

        let depositAddress = await this.voteService.sourceSubwallet.getOwnerDepositAddress();
        const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(StandardCoinName.ELA, [depositAddress],
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
                if (!this.dposInfo.identity || this.dposInfo.identity == "DPoSV1") {
                    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.EDIT }); // Replace ela logo with close icon
                    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                        void this.goToUpdate();
                    });
                }
                break;

            // Inactive indicates the producer has been inactivated for a period which shall
            // be punished and will be activated later.
            case 'Inactive':
                this.titleBar.setTitle(this.translate.instant('dposregistration.dpos-node-info'));
                break;
            // Canceled indicates the producer was canceled.
            case 'Canceled':
                this.titleBar.setTitle(this.translate.instant('dposregistration.retrieve'));

                this.blockHeight = await GlobalElastosAPIService.instance.getBlockCount(StandardCoinName.ELA);
                this.cancelHeight = this.dposInfo.cancelheight;
                void this.getDepositcoin();
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

    goToUpdate() {
        if (!this.nodesService.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposregistration.text-update-no-confirm');
            return;
        }

        void this.globalNav.navigateTo(App.DPOS_VOTING, '/dposregistration/registration');
    }

    async getDepositcoin() {
        const param = {
            method: 'getdepositcoin',
            params: {
                ownerpublickey: this.dposInfo.ownerpublickey,
            },
        };
        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.jsonRPCService.httpPost(rpcApiUrl, param, 'default', 10000, false, true);
        Logger.log(App.DPOS_REGISTRATION, "getdepositcoin:", result);
        if (!Util.isEmptyObject(result.available)) {
            this.available = result.available;
            Logger.log(App.DPOS_REGISTRATION, "available:", this.available);
        }
    }

    async unregister() {
        Logger.log(App.DPOS_REGISTRATION, 'Calling createUnregisterDPoSTransaction()');

        if (!await this.globalPopupService.ionicConfirm('common.warning', 'dposregistration.dpos-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.voteService.sourceSubwallet.generateCancelProducerPayload(this.dposInfo.ownerpublickey, payPassword);

        await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
        const rawTx = await this.voteService.sourceSubwallet.createCancelProducerTransaction(payload, "");
        await this.globalNative.hideLoading();
        let ret = await this.voteService.signAndSendRawTransaction(rawTx);
        if (ret) {
            this.voteService.toastSuccessfully('dposregistration.unregister');
        }
    }

    async retrieve() {
        Logger.log('wallet', 'Calling retrieve()', this.dposInfo);

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            let depositAddress = await this.voteService.sourceSubwallet.getOwnerDepositAddress();
            let utxoArray = await GlobalElastosAPIService.instance.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
            Logger.log(App.DPOS_REGISTRATION, "utxoArray:", utxoArray);

            let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

            const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction(utxo, this.available, "");
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('dposregistration.retrieve');
            }
        } catch (e) {
            await this.globalNative.hideLoading();
        }
    }

}
