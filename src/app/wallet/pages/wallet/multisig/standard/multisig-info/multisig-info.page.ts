import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { StandardMultiSigMasterWallet } from 'src/app/wallet/model/masterwallets/standard.multisig.masterwallet';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

@Component({
    selector: 'app-multisig-info',
    templateUrl: './multisig-info.page.html',
    styleUrls: ['./multisig-info.page.scss'],
})
export class MultiSigInfoPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: StandardMultiSigMasterWallet = null;
    public displayedKey = '';

    constructor(
        public translate: TranslateService,
        private native: Native,
        private walletService: WalletService,
    ) {
    }

    ngOnInit() {
        this.masterWallet = this.walletService.getActiveMasterWallet() as StandardMultiSigMasterWallet;
        this.displayedKey = this.walletService.getActiveNetworkWallet().getExtendedPublicKey();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.multi-sig-extended-public-key-title'));
    }

    copyAddress(key: string) {
        void this.native.copyClipboard(key);
        this.native.toast("common.copied-to-clipboard");
    }
}
