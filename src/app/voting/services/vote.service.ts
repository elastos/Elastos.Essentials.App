import { Injectable } from '@angular/core';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { RawTransactionPublishResult } from 'src/app/wallet/model/providers/transaction.types';
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

    constructor(
        public native: Native,
        private walletManager: WalletService,
        public popupProvider: GlobalPopupService,
        private nav: GlobalNavService,
        private globalIntentService: GlobalIntentService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) {
        this.elastosChainCode = StandardCoinName.ELA;
    }

    public init() {
        Logger.log(App.VOTING, "VoteService init");
        //Get cr members
        if (this.crmembers.length > 0) {
            void this.getCRMembers();
        }
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
            const toCreateWallet = await this.popupProvider.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'common.cancel');
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
            await this.popupProvider.ionicAlert('wallet.text-warning', 'crproposalvoting.multi-sign-reject-voting');
            return;
        }

        this.sourceSubwallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId).getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
        void this.nav.navigateTo(this.context, this.route, this.routerOptions);
        this.clearRoute();
    }

    public async signAndSendRawTransaction(rawTx: any, context?: string, customRoute?: string): Promise<RawTransactionPublishResult> {
        Logger.log(App.VOTING, 'signAndSendRawTransaction rawTx:', rawTx);

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

        if (context) {
            void this.nav.navigateRoot(context, customRoute, { state: { refreash: true } });
        }
        // else {
        //     void this.nav.goToLauncher();
        // }
        return result;
    }

    public async checkWalletAvailableForVote():  Promise<boolean> {
        let utxo = await this.sourceSubwallet.getAvailableUtxo(20000);
        if (!utxo) return false;

        return true;
    }

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
            await this.getCRMembers();
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
}
