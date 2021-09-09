import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { Native } from '../../../services/native.service';
import { WalletService } from '../../../services/wallet.service';
import { WalletCreationService } from '../../../services/walletcreation.service';

@Component({
    selector: 'app-wallet-create-name',
    templateUrl: './wallet-create-name.page.html',
    styleUrls: ['./wallet-create-name.page.scss'],
})
export class WalletCreateNamePage implements OnInit {

    public name = "";

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        private walletManager: WalletService,
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

        if (WalletUtil.isInvalidWalletName(this.name)) {
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
