import { Injectable } from '@angular/core';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { Config } from 'src/app/wallet/config/Config';
import { MainchainSubWallet } from 'src/app/wallet/model/wallets/elastos/mainchain.subwallet';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { StandardCoinName } from '../../wallet/model/coin';
import { WalletAccount, WalletAccountType } from '../../wallet/model/walletaccount';
import { Native } from '../../wallet/services/native.service';
import { WalletService } from '../../wallet/services/wallet.service';


@Injectable({
    providedIn: 'root'
})
export class VoteService {
    private activeWallet: NetworkWallet = null;

    public networkWallet: NetworkWallet = null;
    public masterWalletId: string;
    public elastosChainCode: StandardCoinName = StandardCoinName.ELA;
    public walletInfo: WalletAccount;
    public sourceSubwallet: MainchainSubWallet;

    public intentAction: string;
    public intentId: number;

    private context: string;
    private route: string;
    private routerOptions?: NavigationOptions;

    public crmembers: any[] = [];
    public secretaryGeneralDid: string = null;
    public secretaryGeneralPublicKey: string = null;

    public depositAmount = 500000000000; // 5000 ELA

    constructor(
        public native: Native,
        private walletManager: WalletService,
        public globalPopupService: GlobalPopupService,
        private nav: GlobalNavService,
        private globalIntentService: GlobalIntentService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public translate: TranslateService,
        private globalNative: GlobalNativeService,
    ) {
        this.elastosChainCode = StandardCoinName.ELA;
    }

    public init() {
        Logger.log(App.VOTING, "VoteService init");
        // //Get cr members
        // if (this.crmembers.length > 0) {
        //     void this.getCRMembers();
        // }
    }

    public async selectWalletAndNavTo(context: string, route: string, routerOptions?: NavigationOptions) {
        this.clear();

        // Make sure the active network is elastos, otherwise, ask user to change
        const elastosNetwork = await this.globalSwitchNetworkService.promptSwitchToElastosNetworkIfDifferent();
        if (!elastosNetwork) {
            return;// User has denied to switch network. Can't continue.
        }

        this.context = context;
        this.route = route;
        this.routerOptions = routerOptions;

        this.elastosChainCode = StandardCoinName.ELA;
        this.activeWallet = this.walletManager.getActiveNetworkWallet();

        if (!this.activeWallet) {
            const toCreateWallet = await this.globalPopupService.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'common.cancel');
            if (toCreateWallet) {
                this.native.setRootRouter('/wallet/launcher');
            }
            else {
                return;
            }
        }
        else {
            await this.navigateTo(this.activeWallet);
        }
    }

    private clear() {
        this.networkWallet = null;
        this.masterWalletId = null;
        this.walletInfo = null;
        this.intentAction = null;
        this.intentId = null;
    }

    private clearRoute() {
        this.context = null;
        this.route = null;
        this.routerOptions = null;
    }

    //For select-wallet page call
    public async navigateTo(networkWallet: NetworkWallet) {
        this.networkWallet = networkWallet;
        this.masterWalletId = networkWallet.id;
        this.walletInfo = this.walletManager.getMasterWallet(this.masterWalletId).account;

        //If multi sign will be rejected
        if (this.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            await this.globalPopupService.ionicAlert('wallet.text-warning', 'voting.multi-sign-reject-voting');
            return;
        }

        this.sourceSubwallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId).getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
        void this.nav.navigateTo(this.context, this.route, this.routerOptions);
        this.clearRoute();
    }

    public async signAndSendRawTransaction(rawTx: any, context?: string, customRoute?: string): Promise<boolean> {
        Logger.log(App.VOTING, 'signAndSendRawTransaction rawTx:', rawTx);

        if (!rawTx) {
            // throw new Error("rawTx is null");
            return null;
        }

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWalletId,
            elastosChainCode: this.elastosChainCode,
            rawTransaction: rawTx,
            payPassword: '',
            action: this.intentAction,
            intentId: this.intentId,
        });

        const result = await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer, false);
        if (result && result.published) {
            if (context) {
                void this.nav.navigateRoot(context, customRoute, { state: { refreash: true } });
            }
            else {
                void this.nav.navigateBack();
            }
            return true;
        }
        return false;
    }

    public toastSuccessfully(subject: string) {
        let msg = this.translate.instant(subject) + this.translate.instant('voting.successfully');
        this.globalNative.genericToast(msg, 2000, "success");
    }


    public async popupErrorMessage(error: any, context?: string) {
        if (!error) {
            return;
        }

        var message = "";
        if (typeof error == 'string') {
            message = error as string;
        }
        else if (error instanceof String) {
            message = error.toString();
        }
        else if ((error instanceof Object) && error.message) {
            message = error.message;
        }

        if (message == "") {
            return;
        }

        if (!context) {
            context = App.VOTING;
        }
        await this.globalPopupService.ionicAlert("common.error", message);
        Logger.error(context, 'error:', message);
    }

    public async checkWalletAvailableForVote():  Promise<boolean> {
        // if (await this.sourceSubwallet.hasPendingBalance()) {
        //     await this.globalPopupService.ionicAlert("common.please-wait", 'wallet.transaction-pending');
        //     return false;
        // }

        let utxo = await this.sourceSubwallet.getAvailableUtxo(20000);
        if (!utxo) {
            await this.globalPopupService.ionicAlert('wallet.text-warning', 'voting.ela-not-enough');
            return false;
        }

        return true;
    }

    //Note:: now don't use this function to get data
    async getCRMembers() {
        Logger.log(App.VOTING, 'Get CRMembers..');

        this.crmembers = []

        const param = {
            method: 'listcurrentcrs',
            params: {
                state: "all"
            },
        };

        try {
            const elaRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
            const result = await this.jsonRPCService.httpPost(elaRpcApi, param);
            if (!result || !result.crmembersinfo) {
                return;
            }
            Logger.log(App.VOTING, "crmembers:", result.crmembersinfo);
            this.crmembers = result.crmembersinfo;
        }
        catch (err) {
            Logger.error(App.VOTING, 'getCRMembers error', err);
        }
    }

    async getCurrentCRMembers() {
        this.crmembers = [];

        try {
            const crRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
            let result = await this.jsonRPCService.httpGet(crRpcApi + "/api/council/list");
            Logger.log(App.VOTING, 'Get Current CRMembers:', result);
            if (result && result.data) {
                if (result.data.council) {
                    this.crmembers = result.data.council;
                }

                if (result.data.secretariat) {
                    for (let item of result.data.secretariat) {
                        if (item.status == 'CURRENT') {
                            this.secretaryGeneralDid = item.did;
                            Logger.log(App.VOTING, 'secretaryGeneralDid:', this.secretaryGeneralDid);
                            break;
                        }
                    }
                }
            }

        }
        catch (err) {
            Logger.error(App.VOTING, 'getCurrentCRMembers error:', err);
        }
    }

    async isCRMember() {
        await this.getCurrentCRMembers();
        var ret = false;
        Logger.log(App.VOTING, 'my did:', GlobalDIDSessionsService.signedInDIDString);
        for (let member of this.crmembers) {
            if (Util.isSelfDid(member.did)) {
                ret = true;
            }
        }
        Logger.log(App.VOTING, 'isCRMember:', ret);
        return ret;
    }

    public getCrRpcApi(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
    }

    public getElaRpcApi(): string {
        return this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
    }

    async getSecretaryGeneralDid() {
        if (this.secretaryGeneralDid == null) {
            await this.getCurrentCRMembers();
        }

        return this.secretaryGeneralDid;
    }

    async getSecretaryGeneralPublicKey() {
        if (this.secretaryGeneralPublicKey == null) {
            const param = {
                method: 'getsecretarygeneral',
            };

            try {
                const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
                Logger.log(App.VOTING, 'getSecretaryGeneralPublicKey', result);
                if (result && result.secretarygeneral) {
                    this.secretaryGeneralPublicKey = result && result.secretarygeneral;
                }
            }
            catch (err) {
                Logger.error(App.VOTING, 'getSecretaryGeneralPublicKey error', err);
            }
        }

        return this.secretaryGeneralPublicKey;
    }

    async isSecretaryGeneral(): Promise<boolean> {
        let secretaryGeneralDid = await this.getSecretaryGeneralDid();
        return (secretaryGeneralDid == GlobalDIDSessionsService.signedInDIDString) || (("did:elastos:" + secretaryGeneralDid) ==  GlobalDIDSessionsService.signedInDIDString);
    }

    // The wallet that has no ELA subwallet can't vote, eg. the wallet imported by privat key.
    canVote() {
        return this.sourceSubwallet ? true : false;
    }

    async getCurrentHeight(): Promise<number> {
        Logger.log(App.CRPROPOSAL_VOTING, 'Get Current Height...');

        const param = {
            method: 'getcurrentheight',
            params: {
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
            Logger.log(App.CRPROPOSAL_VOTING, 'getCurrentHeight', result);
            if (result) {
                return result;
            }
        }
        catch (err) {
            Logger.error(App.CRCOUNCIL_VOTING, 'getCurrentHeight error', err);
        }

        return 0;
    }

    async getConfirmCount(txid: string): Promise<number> {
        //Get ower info
        const param = {
            method: 'getrawtransaction',
            params: {
                txid: txid,
                verbose: true
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        const result = await this.jsonRPCService.httpPost(rpcApiUrl, param);
        if (result && result.confirmations) {
            return result.confirmations;
        }

        return -1;
    }

    /**
     * Fees needed to pay for the vote transaction. They have to be deduced from the total amount otherwise
     * funds won't be enough to vote.
     */
    votingFees(): number {
        return 20000; // The unit is SELA, 20000 SELA = 0.0002ELA. The real fee is 10000 SELA
    }

    async getMaxVotes(): Promise<number> {
        await this.sourceSubwallet.updateBalanceSpendable();
        const stakeAmount = this.sourceSubwallet.getRawBalanceSpendable().minus(this.votingFees());
        if (!stakeAmount.isNegative()) {
            return Math.floor(stakeAmount.dividedBy(Config.SELAAsBigNumber).toNumber());
        }
        else {
            return 0;
        }
    }

    async checkBalanceForRegistration(): Promise<boolean> {
        let amount = this.depositAmount + this.votingFees();
        await this.sourceSubwallet.updateBalanceSpendable();
        if (this.sourceSubwallet.getRawBalanceSpendable().lt(amount)) {
            return false;
        }
        return true;
    }

    getRemainingTimeString(remainingTime: number): Promise<string> {
        var ret;
        if (remainingTime >= (1440 * 2)) { //more 2 days
            ret = Math.floor(remainingTime / 1440) + " " + this.translate.instant('voting.days');
        }
        else if (remainingTime > 1440) {
            ret = "1 " + this.translate.instant('voting.day') + " " + Math.floor((remainingTime % 1440) / 60) + " " + this.translate.instant('voting.hours');
        }
        else if (remainingTime == 1440) {
            ret = "1 " + this.translate.instant('voting.day');
        }
        else if (remainingTime > 120) {
            ret = Math.floor(remainingTime / 60) + " " + this.translate.instant('voting.hours');
        }
        else if (remainingTime > 60) {
            ret = Math.floor(remainingTime / 60) + " " + this.translate.instant('voting.hours') + " "
                + Math.floor(remainingTime % 60) + " " + this.translate.instant('voting.minutes');
        }
        else if (remainingTime == 60) {
            ret = "1 " + this.translate.instant('voting.hours');
        }
        else {
            ret = remainingTime + " " + this.translate.instant('voting.minutes');
        }
        return ret;
    }

    async checkPendingBalance(): Promise<boolean> {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.globalPopupService.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        return true;
    }

    async getWalletFirstPublicKey() {
        let ret = await this.walletManager.spvBridge.getPublicKeys(this.masterWalletId, StandardCoinName.ELA, 0, 1, false);
        if (ret && ret.length == 1) {
            return ret[0]
        }
    }

    async getDidPublicKey() {
        return await Util.getSelfPublicKey();
    }

    async isSamePublicKey(): Promise<boolean> {
        let ret1 = await this.getDidPublicKey();
        let ret2 = await this.getWalletFirstPublicKey();
        return ret1 == ret2;
    }

}
