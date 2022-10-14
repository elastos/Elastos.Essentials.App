import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';

const AddressCount = 20;

@Component({
    selector: 'app-coin-address',
    templateUrl: './coin-address.page.html',
    styleUrls: ['./coin-address.page.scss'],
})

export class CoinAddressPage {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public addressList = [];
    public masterWalletId: string;
    private networkWallet: AnyNetworkWallet;
    public subWalletId: string;
    private subWallet: AnySubWallet = null;
    public curCount = 0;
    private maxCount = 0;

    constructor(
        public walletManager: WalletService,
        public native: Native,
        private globalNav: GlobalNavService,
        public router: Router,
        public events: GlobalEvents,
        public theme: GlobalThemeService,
        private translate: TranslateService,
    ) {
        this.init();
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            // General Values
            this.masterWalletId = navigation.extras.state.masterWalletId;
            this.subWalletId = navigation.extras.state.subWalletId;

            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
            this.subWallet = this.networkWallet.getSubWallet(this.subWalletId);

            this.maxCount = this.subWallet.getAddressCount(false);
            void this.getAddressList(null);
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.select-address"));
    }

    async getAddressList(infiniteScroll: any) {
        const allAddresses = this.networkWallet.safe.getAddresses(this.curCount, AddressCount, false, AddressUsage.DEFAULT);
        let disabled = true;
        if (allAddresses) {
            if (this.curCount !== 0) {
                this.addressList = this.addressList.concat(allAddresses);
            } else {
                this.addressList = allAddresses;
            }

            this.curCount = this.curCount + AddressCount;
            if (this.curCount < this.maxCount) {
                disabled = false;
            }
        }

        if (infiniteScroll != null) {
            infiniteScroll.complete();
            infiniteScroll.disabled = disabled;
        }
        if (disabled) {
            this.native.toast_trans('wallet.coin-address-load-finish');
        }
    }

    selectAddress(address) {
        this.events.publish('selectaddress', address);
        void this.globalNav.navigateBack();
    }

    doInfinite(event) {
        setTimeout(() => {
            void this.getAddressList(event.target);
        }, 500);
    }
}
