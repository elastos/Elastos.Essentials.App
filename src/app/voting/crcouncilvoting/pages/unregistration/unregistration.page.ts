import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { Utxo, UtxoType } from 'src/app/wallet/model/providers/transaction.types';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CandidatesService } from '../../services/candidates.service';

type CRTransactionInfo = {
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
export class CandidateUnRegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList;
    public state = "";
    public elastosChainCode = StandardCoinName.ELA;
    public candidateInfo: any;

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
    public transactionInfo: CRTransactionInfo = {
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
        private walletManager: WalletService,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public candidatesService: CandidatesService,
    ) {

    }

    ngOnInit() {
        Logger.log("CandidateUnRegistrationPage", "ngOnInit")
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async ionViewWillEnter() {

        Logger.log("CandidateUnRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.candidateInfo = this.candidatesService.candidateInfo;
        if (this.candidatesService.candidateInfo.state == 'Pending') {
            await this.candidatesService.fetchCandidates();
            this.candidateInfo = this.candidatesService.candidateInfo;
        }

        let depositAddress = await this.walletManager.spvBridge.getOwnerDepositAddress(this.masterWalletId, StandardCoinName.ELA);
        const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(StandardCoinName.ELA, [depositAddress],
            this.TRANSACTION_LIMIT);
        if (txRawList && txRawList.length > 0) {
            this.transactionInfo = txRawList[0].result.txhistory[0] as CRTransactionInfo;
            // this.publishedTime = (new Date(this.transactionInfo.time * 1000)).toLocaleString();
            this.publishedTime = Util.timestampToDateTime(this.transactionInfo.time * 1000);
            Logger.log(App.CRCOUNCIL_VOTING, "transactionInfo:", this.transactionInfo);
        }

        switch (this.candidateInfo.state) {

            // Pending indicates the producer is just registered and didn't get 6
            // confirmations yet.
            case 'Pending':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.candidate-info'));
                this.confirmCount = await this.voteService.getConfirmCount(this.transactionInfo.txid);
                break;
            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.candidate-info'));
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.EDIT }); // Replace ela logo with close icon
                this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                    void this.goToUpdate();
                });
                break;

            // Canceled indicates the producer was canceled.
            case 'Canceled':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.retrieve'));

                this.blockHeight = await GlobalElastosAPIService.instance.getBlockCount(StandardCoinName.ELA);
                this.cancelHeight = this.candidateInfo.cancelheight;
                void this.getDepositcoin();
                break;
            // Returned indicates the producer has canceled and deposit returned.
            case 'Returned':
                this.titleBar.setTitle(this.translate.instant('crcouncilvoting.return'));
                break;
        }
    }

    goToUpdate() {
        if (!this.candidateInfo.txConfirm) {
            this.globalNative.genericToast('crcouncilvoting.text-update-no-confirm');
            return;
        }

        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
    }

    async getDepositcoin() {
        const param = {
            method: 'getdepositcoin',
            params: {
                ownerpublickey: this.candidateInfo.ownerpublickey,
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

        Logger.log(App.CRCOUNCIL_VOTING, 'Calling unregister()');

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'crcouncilvoting.candidate-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        // try {
        //     let payload = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.voteService.masterWalletId, StandardCoinName.ELA,
        //         this.candidatesService.candidateInfo.cid);
        //     if (payload) {
        //         let signature = await this.candidatesService.getSignature(payload.Digest);
        //         if (signature) {
        //             payload.Signature = signature;
        //             Logger.log('CandidateRegistrationPage', 'generateUnregisterCRPayload', payload);
        //             const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");
        //             await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
        //         }
        //     }
        // }
        // catch (e) {

        // }
    }

    async retrieve() {
        Logger.log('wallet', 'Calling retrieve()', this.candidateInfo);

        let depositAddress = await this.walletManager.spvBridge.getOwnerDepositAddress(this.masterWalletId, StandardCoinName.ELA);
        let utxoArray = await GlobalElastosAPIService.instance.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
        Logger.log(App.DPOS_REGISTRATION, "utxoArray:", utxoArray);

        let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

        const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction(utxo, this.available, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
    }

}
