import { Component, OnInit, ViewChild } from '@angular/core';
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
import BigNumber from 'bignumber.js';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { WalletJsonRPCService } from 'src/app/wallet/services/jsonrpc.service';
import { Utxo, UtxoType } from 'src/app/wallet/model/Transaction';
import { App } from 'src/app/model/app.enum';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';


type CRRegistrationInfo = {
    cid?: string;
    code?: string;
    depositaddress?: string;
    depositamout?: string;
    did: string;
    dpospublickey?: string;
    impeachmentvotes?: string;
    index?: number;
    location: number;
    nickname: string;
    penalty?: string;
    state: string;
    url: string;
}



@Component({
    selector: 'app-registration',
    templateUrl: './registration.page.html',
    styleUrls: ['./registration.page.scss'],
})
export class CRCouncilRegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList;
    public crInfo: CRRegistrationInfo = {
        nickname: "test",
        location: 86,
        url:'http://test.com',
        state: "Unregistered",
        did: "",
    };
    public status = "";
    public elastosChainCode = StandardCoinName.ELA;
    public did: string;
    public state = "";
    public crPublicKey = "";

    public available = 0;
    public rpcApiUrl: string;

    balance: BigNumber; // ELA

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
        private globalElastosAPIService: GlobalElastosAPIService,
    ) {

    }

    ngOnInit() {
        Logger.log("CRCouncilRegistrationPage", "ngOnInit")
    }

    async ionViewWillEnter() {
        Logger.log("CRCouncilRegistrationPage", this.voteService.masterWalletId);
        this.did = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        this.masterWalletId = this.voteService.masterWalletId;

        const crPublickeys = await this.walletManager.spvBridge.getAllPublicKeys(this.masterWalletId, StandardCoinName.IDChain, 0, 1);
        this.crPublicKey = crPublickeys.PublicKeys[0];

        //Get cr ower info
        const param = {
            method: 'listcurrentcrs',
            params: {
                state: "all"
            },
        };

        this.rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.jsonRPCService.httpPost(this.rpcApiUrl, param);
        if (!Util.isEmptyObject(result.crmembersinfo)) {
            Logger.log(App.CRCOUNCIL_MANAGER, "crmembers:", result.crmembersinfo);
            for (const crmember of result.crmembersinfo) {
                if (crmember.did == GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "")) {
                    this.state = crmember.state;
                    this.crInfo = crmember;
                    Logger.log(App.CRCOUNCIL_MANAGER, "owner info:", this.crInfo);
                    break;
                }
            }
        }

        // let info = JSON.parse(ret);
        // this.status = info.Status;
        // Logger.log("crcouncilregistration", info);
        // switch (info.Status) {
        //     case 'Unregistered':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.registration'));
        //         let ownerPublickey = await this.walletManager.spvBridge.getOwnerPublicKey(this.masterWalletId, StandardCoinName.ELA);
        //         this.crInfo.DID = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        //         this.crInfo.CROwnerPublicKey = ownerPublickey;
        //         break;
        //     case 'Registered':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.member-info'));
        //         this.crInfo = info.Info;
        //         break;
        //     case 'Canceled':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.retrieve'));
        //         this.crInfo = info.Info;
        //         break;
        // }

        switch (this.crInfo.state) {
            case 'Unregistered':
                this.titleBar.setTitle(this.translate.instant('dposregistration.registration'));
                this.crInfo.did = this.did;
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

                // this.blockHeight = await this.walletRPCService.getBlockCount(StandardCoinName.ELA);
                // this.cancelHeight = this.dposInfo.cancelheight;
                // const param = {
                //     method: 'getdepositcoin',
                //     params: {
                //         ownerpublickey: this.ownerPublicKey,
                //     },
                // };
                // const result = await this.jsonRPCService.httpPost(this.rpcApiUrl, param);
                // Logger.log(App.DPOS_REGISTRATION, "getdepositcoin:", result);
                // if (!Util.isEmptyObject(result.available)) {
                //     this.available = result.available;
                //     Logger.log(App.DPOS_REGISTRATION, "available:", this.available);
                // }

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

        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);

    }

    async register() {
        Logger.log('crcouncilregistration', 'Calling register()', this.crInfo);

        this.balance = this.voteService.masterWallet.getSubWalletBalance(this.elastosChainCode);

        //Check value
        if (this.balance.lt(0.0002)) {
            void this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

    // payload.Signature = await this.walletManager.spvBridge.didSignDigest(this.masterWallet.id,
    //         this.transfer.did, digest, payPassword);

        const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crPublicKey, this.crInfo.did, this.crInfo.nickname, this.crInfo.url, this.crInfo.location);

        const rawTx = await this.voteService.sourceSubwallet.createRegisterCRTransaction(payload, this.depositAmount, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
    }

    async unregister() {
        Logger.log('crcouncilregistration', 'Calling createUnregisterCRCouncilTransaction()');


        const payload = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crInfo.did);

        const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
    }

    async update() {
        Logger.log('crcouncilregistration', 'Calling update()', this.crInfo);

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crPublicKey, this.crInfo.did, this.crInfo.nickname, this.crInfo.url, this.crInfo.location);

        const rawTx = await this.voteService.sourceSubwallet.createUpdateCRTransaction(payload, "");
        await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
    }

    async retrieve() {
        Logger.log('crcouncilregistration', 'Calling retrieve()', this.crInfo);

        // const crPublickeys = await this.walletManager.spvBridge.getAllPublicKeys(this.masterWalletId, StandardCoinName.IDChain, 0, 1);
        // const crPublicKey = crPublickeys.PublicKeys[0];

        let depositAddress = await this.walletManager.spvBridge.getCRDepositAddress(this.masterWalletId, StandardCoinName.ELA);

        let utxoArray = await this.walletRPCService.getAllUtxoByAddress(StandardCoinName.ELA, [depositAddress], UtxoType.Normal) as Utxo[];
        Logger.log(App.CRCOUNCIL_MANAGER, "utxoArray:", utxoArray);

        let utxo = await this.voteService.sourceSubwallet.getUtxoForSDK(utxoArray);

        const rawTx = await this.voteService.sourceSubwallet.createRetrieveDepositTransaction(utxo, this.available, "");

        await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
    }

}
