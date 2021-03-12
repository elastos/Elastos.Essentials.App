import { Component, ViewChild } from '@angular/core';
import { Native } from '../../../../services/native.service';
import { WalletManager } from '../../../../services/wallet.service';
import { Util } from '../../../../model/Util';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Events } from '../../../../services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

@Component({
    selector: 'app-coin-address',
    templateUrl: './coin-address.page.html',
    styleUrls: ['./coin-address.page.scss'],
})

export class CoinAddressPage {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    addressList = [];
    public masterWalletId: string;
    public chainId: string;
    curCount = 0;

    constructor(
        public walletManager: WalletManager,
        public native: Native,
        private navCtrl: NavController,
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
            this.chainId = navigation.extras.state.chainId;
            this.getAddressList(null);
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("select-address"));
    }

    async getAddressList(infiniteScroll: any) {
        const allAddresses = await this.walletManager.spvBridge.getAllAddresses(this.masterWalletId, this.chainId, this.curCount, false);
        const addresses = allAddresses['Addresses'];
        const maxCount = allAddresses['MaxCount'];
        let disabled = true;
        if (addresses) {
            if (this.curCount !== 0) {
                this.addressList = this.addressList.concat(addresses);
            } else {
                this.addressList = addresses;
            }

            this.curCount = this.curCount + 20;
            if (this.curCount < maxCount) {
                disabled = false;
            }
        }

        if (infiniteScroll != null) {
            infiniteScroll.complete();
            infiniteScroll.disabled = disabled;
        }
        if (disabled) {
            this.native.toast_trans('coin-address-load-finish');
        }
    }

    selectAddress(address) {
        this.events.publish('selectaddress', address);
        this.navCtrl.back();
    }

    doInfinite(event) {
        setTimeout(() => {
            this.getAddressList(event.target);
        }, 500);
    }
}
