import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Util } from '../../../model/util';
import { MasterWallet } from '../../../model/wallets/masterwallet';
import { Native } from '../../../services/native.service';
import { LocalStorage } from '../../../services/storage.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletEditionService } from '../../../services/walletedition.service';

@Component({
    selector: 'app-wallet-edit-name',
    templateUrl: './wallet-edit-name.page.html',
    styleUrls: ['./wallet-edit-name.page.scss'],
})
export class WalletEditNamePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public walletname = "";
    public masterWallet: MasterWallet = null;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: Events,
        private walletManager: WalletService,
        private walletEditionService: WalletEditionService,
        private translate: TranslateService,
        public theme: GlobalThemeService
    ) {
        this.masterWallet = this.walletManager.getMasterWallet(this.walletEditionService.modifiedMasterWalletId);
        this.walletname = this.walletManager.masterWallets[this.masterWallet.id].name;
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.wallet-edit-name-title"));
    }

    modify() {
        if (Util.isNull(this.walletname)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-enter-name");
            return;
        }

        if (Util.isWalletName(this.walletname)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-not-valid-name");
            return;
        }

        if (this.walletManager.walletNameExists(this.walletname)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-already-exists");
            return;
        }

        void this.modifyName();
    }

    async modifyName() {
        let masterWallet = this.walletManager.masterWallets[this.masterWallet.id];
        masterWallet.name = this.walletname;
        await masterWallet.save();
        this.native.pop();
    }
}
