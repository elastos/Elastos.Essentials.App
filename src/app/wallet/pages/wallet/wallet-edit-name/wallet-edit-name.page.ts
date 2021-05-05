import { Component, OnInit, ViewChild } from '@angular/core';
import { Util } from '../../../model/Util';
import { Native } from '../../../services/native.service';
import { LocalStorage } from '../../../services/storage.service';
import { ActivatedRoute } from '@angular/router';
import { WalletManager } from '../../../services/wallet.service';
import { WalletEditionService } from '../../../services/walletedition.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';

@Component({
    selector: 'app-wallet-edit-name',
    templateUrl: './wallet-edit-name.page.html',
    styleUrls: ['./wallet-edit-name.page.scss'],
})
export class WalletEditNamePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public walletname: string = "";
    public masterWallet: MasterWallet = null;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: Events,
        private walletManager: WalletManager,
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

        this.modifyName();
    }

    async modifyName() {
        this.walletManager.masterWallets[this.masterWallet.id].name = this.walletname;
        await this.walletManager.saveMasterWallet(this.masterWallet);
        this.native.pop();
    }
}
