import { Native } from '../../wallet/services/native.service';
import { StandardCoinName } from '../../wallet/model/Coin';
import { Injectable } from '@angular/core';
import { WalletManager } from '../../wallet/services/wallet.service';
import { MasterWallet } from '../../wallet/model/wallets/MasterWallet';

import { Logger } from 'src/app/logger';
import { WalletAccount, WalletAccountType } from '../../wallet/model/WalletAccount';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { MainchainSubWallet } from 'src/app/wallet/model/wallets/MainchainSubWallet';
import { PopupProvider } from 'src/app/services/global.popup.service';

@Injectable({
    providedIn: 'root'
})
export class VoteService {
    private walletList: MasterWallet[] = null;

    public masterWallet: MasterWallet = null;
    public masterWalletId: string;
    public chainId: StandardCoinName = StandardCoinName.ELA;;
    public walletInfo: WalletAccount;
    public sourceSubwallet: MainchainSubWallet;

    public intentAction: string;
    public intentId: number;

    private context: string;
    private route: string;
    private routerOptions?: NavigationOptions;


    constructor(
        public native: Native,
        private walletManager: WalletManager,
        public popupProvider: PopupProvider,
        private nav: GlobalNavService,
        private globalIntentService: GlobalIntentService
    ) {
        this.chainId = StandardCoinName.ELA;
    }

    public async init() {
        Logger.log("wallet", "VoteService init");
    }

    public async selectWalletAndNavTo(context: string, route: string, routerOptions?: NavigationOptions) {
        this.clear();

        this.context = context;
        this.route = route;
        this.routerOptions = routerOptions;

        this.chainId = StandardCoinName.ELA;
        this.walletList = this.walletManager.getWalletsList();

        if (this.walletList.length < 1) {
            const toCreateWallet = await this.popupProvider.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'common.cancel');
            if (toCreateWallet) {
                this.native.setRootRouter('/wallet/launcher');
            }
            else {
                return;
            }
        }
        else if (this.walletList.length === 1) {
            this.navigateTo(this.walletList[0]);
        }
        else {
            this.native.setRootRouter('/vote/select-wallet');
        }
    }

    private clear() {
        this.masterWallet = null;
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
    public async navigateTo(masterWallet: MasterWallet) {
        this.masterWallet = masterWallet;
        this.masterWalletId = masterWallet.id;
        this.walletInfo = masterWallet.account;

        //If multi sign will be rejected
        if (this.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            await this.popupProvider.ionicAlert('wallet.text-warning', 'crproposalvoting.multi-sign-reject-voting');
            return;
        }

        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
        this.nav.navigateTo(this.context, this.route, this.routerOptions);
        this.clearRoute();
    }

    public async signAndSendRawTransaction(rawTx: any, context?: string): Promise<void> {

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWalletId,
            chainId: this.chainId,
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
            this.nav.navigateRoot(context);
        }
        else {
            this.nav.goToLauncher();
        }
    }
}
