import { Injectable } from '@angular/core';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { PopupProvider } from 'src/app/services/global.popup.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { MainchainSubWallet } from 'src/app/wallet/model/wallets/elastos/mainchain.subwallet';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
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


    constructor(
        public native: Native,
        private walletManager: WalletService,
        public popupProvider: PopupProvider,
        private nav: GlobalNavService,
        private walletNetworkService: WalletNetworkService,
        private walletNetworkUIService: WalletNetworkUIService,
        private globalIntentService: GlobalIntentService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService,
    ) {
        this.elastosChainCode = StandardCoinName.ELA;
    }

    public init() {
        Logger.log("wallet", "VoteService init");
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

    public async signAndSendRawTransaction(rawTx: any, context?: string): Promise<void> {

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
        if (this.intentAction != null) {
            await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
        }

        if (context) {
            void this.nav.navigateRoot(context, null, { state: { refreash: true } });
        }
        else {
            void this.nav.goToLauncher();
        }
    }
}
