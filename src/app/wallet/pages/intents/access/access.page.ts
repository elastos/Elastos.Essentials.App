import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Config } from '../../../config/Config';
import { StandardCoinName } from '../../../model/coin';
import { IntentTransfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletAccessService } from '../../../services/walletaccess.service';


type ClaimRequest = {
    name: string,
    value: any,
    reason: string // Additional usage info string provided by the caller
};

@Component({
    selector: 'app-access',
    templateUrl: './access.page.html',
    styleUrls: ['./access.page.scss'],
})
export class AccessPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public Config = Config;
    public intentTransfer: IntentTransfer;
    public requestDapp = '';
    public networkWallet: NetworkWallet = null;
    public exportMnemonic = false;
    public title = '';
    public requestItems: ClaimRequest[] = [];
    public showReason = false;
    private rootPage = false;

    constructor(
        private globalIntentService: GlobalIntentService,
        public walletManager: WalletService,
        public popupProvider: PopupProvider,
        public native: Native,
        private router: Router,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private walletAccessService: WalletAccessService,
        public uiService: UiService
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.rootPage = navigation.extras.state.rootPage;
        }
    }

    ngOnInit() {
        void this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.access-title'));
        this.titleBar.setNavigationMode(null);
    }

    ionViewWillLeave() {
    }

    async init() {
        this.intentTransfer = this.walletAccessService.intentTransfer;
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.walletAccessService.masterWalletId);
        if (this.intentTransfer.action === 'walletaccess') {
            await this.organizeRequestedFields();
            this.title = this.translate.instant("wallet.access-subtitle-wallet-access-from");
        } else {
            this.exportMnemonic = true;
            this.title = this.translate.instant("wallet.access-subtitle-access-mnemonic-from");
        }
    }

    async organizeRequestedFields() {
        Logger.log('wallet', 'organizeRequestedFields:', this.walletAccessService.requestFields);
        for (const key of Object.keys(this.walletAccessService.requestFields)) {
            const claimValue = await this.getClaimValue(key);
            Logger.log('wallet', 'key:', key, ' value:', claimValue);
            const claimRequest: ClaimRequest = {
                name: key,
                value: claimValue,
                reason: this.claimReason(this.walletAccessService.requestFields[key])
            };
            if (claimRequest.reason) {
                this.showReason = true;
            }
            this.requestItems.push(claimRequest);
        }
    }

    claimReason(claimValue: any): string {
        if (claimValue instanceof Object) {
            return claimValue.reason || null;
        }
        return null;
    }

    async getClaimValue(key) {
        let value = '';
        switch (key) {
            case 'elaaddress':
                value = await this.createAddress(StandardCoinName.ELA);
                break;
            case 'elaamount':
                // for now just return the amount of ELA Chain, not include IDChain
                value = this.networkWallet.subWallets.ELA.balance.toString();
                break;
            case 'ethaddress':
                value = await this.createAddress(StandardCoinName.ETHSC);
                break;
            default:
                Logger.log('wallet', 'Not support ', key);
                break;
        }
        return value;
    }

    getClaimTitle(key) {
        let value = '';
        switch (key) {
            case 'elaaddress':
                value = 'wallet.elaaddress';
                break;
            case 'elaamount':
                value = 'wallet.elaamount';
                break;
            case 'ethaddress':
                value = 'wallet.ethaddress';
                break;
            default:
                Logger.log('wallet', 'Not support ', key);
                break;
        }
        return value;
    }

    createAddress(elastosChainCode: string) {
        return this.networkWallet.getSubWallet(elastosChainCode).createAddress();
    }

    reduceArrayToDict(keyProperty: string) {
        let key: string;
        return (acc, curr, index, array) => {
            acc = acc || {};
            key = curr[keyProperty];
            acc[key] = curr.value;
            return acc;
        };
    }

    buildDeliverableList() {
        const selectedClaim = [];
        const mandatoryDict = this.requestItems.reduce(this.reduceArrayToDict('name'), {});
        selectedClaim.push(mandatoryDict);

        Logger.log('wallet', 'selectedClaim:', selectedClaim);
        return selectedClaim;
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation() {
        await this.globalIntentService.sendIntentResponse(
            { walletinfo: null, status: 'cancelled' },
            this.intentTransfer.intentId
        );
    }

    async onShare() {
        if (this.exportMnemonic) {
            this.native.go('/wallet/mnemonic/export', { fromIntent: true });
        } else {
            const selectedClaim = this.buildDeliverableList();
            await this.globalIntentService.sendIntentResponse(
                { walletinfo: selectedClaim }, this.intentTransfer.intentId);
        }
    }
}
