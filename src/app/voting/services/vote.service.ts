import { Injectable } from '@angular/core';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { Util } from 'src/app/model/util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { Config } from 'src/app/wallet/config/Config';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { ElastosStandardNetworkWallet } from 'src/app/wallet/model/networks/elastos/networkwallets/standard/elastos.networkwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { StandardCoinName } from '../../wallet/model/coin';
import { WalletService } from '../../wallet/services/wallet.service';

export enum DposStatus {
    UNKNOWN,
    DPoSV1,
    DPoSV1V2,
    DPoSV2
}

@Injectable({
    providedIn: 'root'
})
export class VoteService implements GlobalService {
    public activeWallet: ElastosStandardNetworkWallet = null;

    public networkWallet: AnyNetworkWallet = null;
    public masterWalletId: string;
    public elastosChainCode: StandardCoinName = StandardCoinName.ELA;
    public sourceSubwallet: MainChainSubWallet;

    public intentAction: string;
    public intentId: number;

    private context: string;
    private route: string;
    private routerOptions?: NavigationOptions;

    public crmembers: any[] = [];
    public secretaryGeneralDid: string = null;
    public secretaryGeneralPublicKey: string = null;

    public deposit2K = 200000000000; // 2000 ELA
    public deposit5K = 500000000000; // 5000 ELA

    public needFetchData = {};

    public dPoSStatus = new BehaviorSubject<DposStatus>(DposStatus.UNKNOWN);

    constructor(
        private walletManager: WalletService,
        public globalPopupService: GlobalPopupService,
        private nav: GlobalNavService,
        private globalNavService: GlobalNavService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService,
        private globalElastosAPIService: GlobalElastosAPIService,
        public translate: TranslateService,
        private globalNative: GlobalNativeService,
    ) {
        this.elastosChainCode = StandardCoinName.ELA;
    }

    public init() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        void this.getDPoSStatus().then(status => {
            this.dPoSStatus.next(status);
        });
        return;
    }

    onUserSignOut(): Promise<void> {
        this.dPoSStatus.next(DposStatus.UNKNOWN);
        return;
    }

    /* public init() {
        Logger.log(App.VOTING, "VoteService init");

        this.needFetchData[App.DPOS_VOTING] = true;
        this.needFetchData[App.STAKING] = true;

        // //Get cr members
        // if (this.crmembers.length > 0) {
        //     void this.getCRMembers();
        // }
    } */

    public async selectWalletAndNavTo(context: string, route: string, routerOptions?: NavigationOptions) {
        this.clear();
        this.needFetchData[context] = true;

        // Make sure the active network is elastos, otherwise, ask user to change
        const elastosNetwork = await this.globalSwitchNetworkService.promptSwitchToElastosNetworkIfDifferent();
        if (!elastosNetwork) {
            return;// User has denied to switch network. Can't continue.
        }

        this.context = context;
        this.route = route;
        this.routerOptions = routerOptions;

        this.elastosChainCode = StandardCoinName.ELA;
        this.activeWallet = this.walletManager.getActiveNetworkWallet() as ElastosStandardNetworkWallet;

        if (!this.activeWallet) {
            const toCreateWallet = await this.globalPopupService.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'common.cancel');
            if (toCreateWallet) {
                void this.globalNavService.navigateTo(App.WALLET, "/wallet/settings", {
                    state: {
                        createWallet: true
                    }
                });
            }
            else {
                return;
            }
        }
        else {
            await this.navigateTo(this.activeWallet, context);
        }
    }

    private clear() {
        this.networkWallet = null;
        this.masterWalletId = null;
        this.intentAction = null;
        this.intentId = null;
    }

    private clearRoute() {
        this.context = null;
        this.route = null;
        this.routerOptions = null;
    }

    //For select-wallet page call
    private async navigateTo(networkWallet: ElastosStandardNetworkWallet, context: string) {
        this.networkWallet = networkWallet;
        this.masterWalletId = networkWallet.id;

        var supportMultiSign = false;
        switch (context) {
            case App.DPOS2:
            case App.STAKING:
            case App.VOTING:
            case App.CRCOUNCIL_VOTING:
            case App.CRPROPOSAL_VOTING:
            case App.CRSUGGESTION:
                supportMultiSign = true;
                break;
            default:
                break;
        }

        switch (networkWallet.masterWallet.type) {
            case WalletType.STANDARD:
                break;
            case WalletType.LEDGER:
                await this.globalPopupService.ionicAlert('wallet.text-warning', 'voting.ledger-reject-voting');
                return;
            case WalletType.MULTI_SIG_STANDARD:
            case WalletType.MULTI_SIG_EVM_GNOSIS:
                if (!supportMultiSign) {
                    await this.globalPopupService.ionicAlert('wallet.text-warning', 'voting.multi-sign-reject-voting');
                    return;
                }
                break;
            default:
                // Should not happen.
                Logger.error('wallet', 'Not support, pls check the wallet type:', networkWallet.masterWallet.type)
                return;
        }

        this.sourceSubwallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId).getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;
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
        this.globalNative.genericToast(msg, 2000);
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

    public async checkWalletAvailableForVote(): Promise<boolean> {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.globalPopupService.ionicAlert("common.please-wait", 'wallet.transaction-pending');
            return false;
        }

        let enoughBalance = await this.sourceSubwallet.isAvailableBalanceEnough(new BigNumber(20000));
        if (!enoughBalance) {
            await this.globalPopupService.ionicAlert('wallet.insufficient-balance', 'voting.not-enough-ela-for-vote');
            return false;
        }

        return true;
    }

    //Note:: now don't use this function to get data
    // async getCRMembers() {
    //     Logger.log(App.VOTING, 'Get CRMembers..');

    //     this.crmembers = []

    //     const param = {
    //         method: 'listcurrentcrs',
    //         params: {
    //             state: "all"
    //         },
    //     };

    //     try {
    //         const elaRpcApi = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
    //         const result = await this.jsonRPCService.httpPost(elaRpcApi, param);
    //         if (!result || !result.crmembersinfo) {
    //             return;
    //         }
    //         Logger.log(App.VOTING, "crmembers:", result.crmembersinfo);
    //         this.crmembers = result.crmembersinfo;
    //     }
    //     catch (err) {
    //         Logger.error(App.VOTING, 'getCRMembers error', err);
    //     }
    // }

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
        Logger.log(App.VOTING, 'my did:', DIDSessionsStore.signedInDIDString);
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
                    this.secretaryGeneralPublicKey = result.secretarygeneral;
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
        return (secretaryGeneralDid == DIDSessionsStore.signedInDIDString) || (("did:elastos:" + secretaryGeneralDid) == DIDSessionsStore.signedInDIDString);
    }

    // The wallet that has no ELA subwallet can't vote, eg. the wallet imported by privat key.
    canVote() {
        return this.sourceSubwallet ? true : false;
    }

    async getBlockByHeight(currentHeight: number): Promise<number> {
        Logger.log(App.VOTING, 'Get Block By Height...');

        const param = {
            method: 'getblockbyheight',
            params: {
                height: currentHeight
            },
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
            Logger.log(App.CRPROPOSAL_VOTING, 'getBlockByHeight', result);
            if (result && result.time) {
                return result.time;
            }
        }
        catch (err) {
            Logger.error(App.VOTING, 'getBlockByHeight error', err);
        }

        return 0;
    }

    async getConfirmCount(txid: string): Promise<number> {
        //Get ower dpos info
        const result = await await GlobalElastosAPIService.instance.getRawTransaction(txid);
        if (result && result.confirmations) {
            return result.confirmations;
        }

        return -1;
    }

    /**
     * Fees needed to pay for the vote transaction. They have to be deduced from the total amount otherwise
     * funds won't be enough to vote.
     * Reserve some utxos so that other votes can be executed without changing the dpos voting.
     */
    votingFees(): number {
        return 100000; // The unit is SELA, 100000 SELA = 0.001ELA. The real fee is 10000 SELA
    }

    getRawBalanceSpendable(): BigNumber {
        let ret = this.sourceSubwallet.getRawBalanceSpendable();
        if (ret == null) {
            ret = new BigNumber(0);
        }
        return ret;
    }

    async getMaxVotes(): Promise<number> {
        await this.sourceSubwallet.updateBalanceSpendable();
        const stakeAmount = this.getRawBalanceSpendable().minus(this.votingFees());
        if (!stakeAmount.isNegative()) {
            return Math.floor(stakeAmount.dividedBy(Config.SELAAsBigNumber).toNumber());
        }
        else {
            return 0;
        }
    }

    async checkBalanceForRegistration(depositAmount: number): Promise<boolean> {
        let amount = depositAmount + this.votingFees();
        await this.sourceSubwallet.updateBalanceSpendable();
        if (this.getRawBalanceSpendable().lt(amount)) {
            return false;
        }
        return true;
    }

    getRemainingTimeString(remainingBlockCount: number): Promise<string> {
        var ret;
        if (remainingBlockCount >= (720 * 2)) { //more 2 days
            ret = " " + Math.floor(remainingBlockCount / 720) + " " + this.translate.instant('voting.days');
        }
        else if (remainingBlockCount > 720) {
            ret = " 1 " + this.translate.instant('voting.day') + " " + Math.floor((remainingBlockCount % 720) / 30) + " " + this.translate.instant('voting.hours');
        }
        else if (remainingBlockCount == 720) {
            ret = " 1 " + this.translate.instant('voting.day');
        }
        else if (remainingBlockCount > 60) {
            ret = " " + Math.floor(remainingBlockCount / 30) + " " + this.translate.instant('voting.hours');
        }
        else if (remainingBlockCount > 30) {
            ret = " " + Math.floor(remainingBlockCount / 30) + " " + this.translate.instant('voting.hours') + " "
                + Math.floor(remainingBlockCount % 30) * 2 + " " + this.translate.instant('voting.minutes');
        }
        else if (remainingBlockCount == 30) {
            ret = " 1 " + this.translate.instant('voting.hours');
        }
        else {
            ret = " " + remainingBlockCount * 2 + " " + this.translate.instant('voting.minutes');
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
        let ret = await this.sourceSubwallet.getPublicKeys(0, 1, false);
        if (ret) {
            if (ret instanceof Array) {
                return ret[0]
            } else return ret;
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

    isMuiltWallet(): boolean {
        if (this.sourceSubwallet.masterWallet.type == WalletType.MULTI_SIG_STANDARD
            || this.sourceSubwallet.masterWallet.type == WalletType.MULTI_SIG_EVM_GNOSIS) {
            return true;
        }
        return false
    }

    private async getDPoSStatus(): Promise<DposStatus> {
        Logger.log(App.VOTING, 'getDPoSStatus...');

        const param = {
            method: 'getdposv2info',
        };

        try {
            const result = await this.jsonRPCService.httpPost(this.getElaRpcApi(), param);
            Logger.log(App.VOTING, 'Received DPoS status response', result);
            if (result && result.height) {
                if (result.height < result.dposv2transitstartheight) {
                    return DposStatus.DPoSV1;
                }
                else if (result.height >= result.dposv2transitstartheight && result.height < result.dposv2activeheight) {
                    return DposStatus.DPoSV1V2;
                }
                else if (result.height >= result.dposv2activeheight) {
                    return DposStatus.DPoSV2;
                }
            }
        }
        catch (err) {
            Logger.error(App.VOTING, 'getDPoSStatus error', err);

            if (typeof err === "object" && "code" in err) {
                if (err.code === -32601) {
                    // On mainnet at first, getdposv2info doesn't exist. In that case, consider the
                    // status as v1, not as unknown.
                    // JSON-RPC method getdposv2info not found
                    return DposStatus.DPoSV1;
                }
            }
        }

        return DposStatus.UNKNOWN;
    }
}
