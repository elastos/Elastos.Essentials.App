import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { CoinTransferService } from 'src/app/wallet/services/cointransfer.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

@Component({
    selector: 'app-wallet-multisig-pub-keys',
    templateUrl: './wallet-multisig-pub-keys.page.html',
    styleUrls: ['./wallet-multisig-pub-keys.page.scss'],
})
export class MultiSigPubKeysPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: AnyNetworkWallet = null;
    private masterWalletId = '1';
    public displayedKey = "";
    public isSingleAddress = false;
    private selectSubscription: Subscription = null;

    constructor(
        public route: ActivatedRoute,
        public zone: NgZone,
        public events: GlobalEvents,
        public walletManager: WalletService,
        public native: Native,
        private router: Router,
        private coinTransferService: CoinTransferService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
    ) {
    }

    ngOnInit() {
        void this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.multi-sig-extended-public-key-title"));
    }

    ngOnDestroy() {
        if (this.selectSubscription) {
            this.selectSubscription.unsubscribe();
        }
    }

    async init(): Promise<void> {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.masterWalletId = navigation.extras.state.masterWalletId;
            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);

            await this.getExtendedPublicKey();
        }
    }

    copyAddress() {
        void this.native.copyClipboard(this.displayedKey);
        this.native.toast("wallet.multi-sig-extended-public-key-copied");
    }

    getExtendedPublicKey() {
        this.displayedKey = this.networkWallet.getExtendedPublicKey();
        Logger.log("wallet", "Extended public key:", this.displayedKey);
    }

    /* showAddressList() {
        this.selectSubscription = this.events.subscribe('selectaddress', (address) => {
            this.zone.run(() => {
                this.qrcode = address;
            });
            this.selectSubscription.unsubscribe();
            this.selectSubscription = null;
        });
        this.native.go(
            '/wallet/coin-address',
            {
                masterWalletId: this.masterWalletId,
                subWalletId: this.subWalletId
            }
        );
    } */
}
