import { Component, OnInit } from '@angular/core';
import { Native } from '../../../services/native.service';
import { Config } from '../../../config/Config';
import { Util } from '../../../model/Util';
import { ActivatedRoute } from '@angular/router';
import { WalletManager } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';
import { Logger } from 'src/app/logger';

@Component({
    selector: 'app-wallet-create-name',
    templateUrl: './wallet-create-name.page.html',
    styleUrls: ['./wallet-create-name.page.scss'],
})
export class WalletCreateNamePage implements OnInit {

    public name: string = "";

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        private walletManager: WalletManager,
        private walletCreationService: WalletCreationService
    ) {
    }

    ngOnInit() {
        Logger.log('wallet', 'ngOnInit WalletCreateNamePage');
    }

    import() {
        if (this.checkParms()) {
            this.walletCreationService.name = this.name;
            this.native.go("/wallet/addpublickey");
        }
    }

    checkParms() {
        if (Util.isNull(this.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-enter-name");
            return false;
        }

        if (Util.isWalletName(this.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-not-valid-name");
            return;
        }

        if (this.walletManager.walletNameExists(this.name)) {
            this.native.toast_trans("wallet.text-wallet-name-validator-already-exists");
            return;
        }

        return true;
    }

}
