import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
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
    public subWalletId: string;
    public curCount = 0;

    constructor(
        public walletManager: WalletService,
        public native: Native,
        private globalNav: GlobalNavService,
        public router: Router,
        public events: Events,
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
            void this.getAddressList(null);
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.select-address"));
    }

    async getAddressList(infiniteScroll: any) {
        const allAddresses = await this.walletManager.spvBridge.getAllAddresses(this.masterWalletId, this.subWalletId, this.curCount, AddressCount, false);
        const addresses = allAddresses['Addresses'];
        const maxCount = allAddresses['MaxCount'];
        let disabled = true;
        if (addresses) {
            if (this.curCount !== 0) {
                this.addressList = this.addressList.concat(addresses);
            } else {
                this.addressList = addresses;
            }

            this.curCount = this.curCount + AddressCount;
            if (this.curCount < maxCount) {
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
