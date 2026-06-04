import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { Config } from '../../../config/Config';
import { IntentTransfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletAccessService } from '../../../services/walletaccess.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { ElastosPGPNetworkBase } from 'src/app/wallet/model/networks/elastos/evms/pgp/network/pgp.networks';


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
    public networkWallet: AnyNetworkWallet = null;
    public exportMnemonic = false;
    public title = '';
    public requestItems: ClaimRequest[] = [];
    public showReason = false;
    private rootPage = false;

    private alreadySentIntentResponse = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;


    constructor(
        private globalIntentService: GlobalIntentService,
        public walletManager: WalletService,
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
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
            key: "close",
            iconPath: BuiltInIcon.CLOSE
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if (icon.key === 'close') {
                void this.cancelOperation();
            }
        });
    }

    ngOnDestroy() {
        if (!this.alreadySentIntentResponse) {
            void this.cancelOperation(false);
        }
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
                value = await this.getAddress('elastos');
                break;
            case 'elaamount':
                value = await this.getElaAmount();
                break;
            case 'ethaddress':
                value = await this.getAddress('elastossmartchain');
                break;
            case 'btcaddress':
                value = await this.getAddress('btc');
                break;
            case 'tronaddress':
                value = await this.getAddress('tron');
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
            case 'btcaddress':
                value = 'wallet.btcaddress';
                break;
            case 'tronaddress':
                value = 'wallet.tronaddress';
                break;
            default:
                Logger.log('wallet', 'Not support ', key);
                break;
        }
        return value;
    }

    async getAddress(networkKey: string) {
        let network = WalletNetworkService.instance.getNetworkByKey(networkKey);
        if (!network) {
            return null;
        }
        let networkWallet = await network.createNetworkWallet(this.networkWallet.masterWallet, false);
        if (!networkWallet) {
          return null; // eg. Multi signature wallet does not support EVM chain.
        }

        let mainTokenSubWallet = networkWallet.getMainTokenSubWallet();
        if (!mainTokenSubWallet) {
            return null;
        }
        return mainTokenSubWallet.getCurrentReceiverAddress();
    }

    async getElaAmount() {
        let networkKey = WalletNetworkService.instance.activeNetwork.value.key;
        switch (networkKey) {
            case 'elastos':
            case 'elastossmartchain':
            case 'elastosidchain':
            case 'elastoseco':
            case 'elastosecopgp':
            break;
            default:
                networkKey = 'elastos';
            break;
        }

        let network = WalletNetworkService.instance.getNetworkByKey(networkKey);
        if (!network) {
            return null;
        }
        let networkWallet = await network.createNetworkWallet(this.networkWallet.masterWallet, false);
        if (!networkWallet) {
          return null; // eg. Multi signature wallet does not support EVM chain.
        }

        let elaTokenSubWallet = null;

        if (networkKey === 'elastosecopgp') {
            // The ela token is erc20 token on pgp sidechain.
            let elaTokenAddress = (networkWallet.network as ElastosPGPNetworkBase).getELATokenContract();
            elaTokenSubWallet = networkWallet.getSubWallet(elaTokenAddress);
        } else {
            elaTokenSubWallet = networkWallet.getMainTokenSubWallet();
        }

        if (!elaTokenSubWallet) {
            return null;
        }

        return elaTokenSubWallet.getDisplayBalance().toFixed();
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
    async cancelOperation(navigateBack = true) {
        await this.sendIntentResponse(
            { walletinfo: null, status: 'cancelled' },
            this.intentTransfer.intentId, navigateBack
        );
    }

    private async sendIntentResponse(result, intentId, navigateBack = true) {
        this.alreadySentIntentResponse = true;
        await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
    }

    async onShare() {
        if (this.exportMnemonic) {
            this.native.go('/wallet/mnemonic/export', { fromIntent: true });
        } else {
            const selectedClaim = this.buildDeliverableList();
            await this.sendIntentResponse(
                { walletinfo: selectedClaim }, this.intentTransfer.intentId);
        }
    }
}
