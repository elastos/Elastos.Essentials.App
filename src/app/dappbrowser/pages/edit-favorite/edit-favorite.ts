import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';

@Component({
    selector: 'page-edit-favorite',
    templateUrl: 'edit-favorite.html',
    styleUrls: ['edit-favorite.scss']
})
export class EditFavoritePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public availableNetworks: Network[] = [];
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public iab: InAppBrowser,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private walletNetworksService: WalletNetworkService
    ) {
    }

    // onExit(data: IABExitData) {
    //     throw new Error('Method not implemented.');
    // }

    ionViewWillEnter() {
        this.titleBar.setTitle("Options");
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            void this.goback();
        });
    }

    ionViewDidEnter() {
        this.availableNetworks = this.walletNetworksService.getAvailableNetworks();
    }

    async goback() {
        await this.nav.navigateBack();
    }

    public isInFavorites(): boolean {
        return false; // TODO
    }
}
