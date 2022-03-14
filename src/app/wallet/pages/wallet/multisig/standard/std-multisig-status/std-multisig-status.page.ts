import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

/**
 * Standard multi signature wallet, screen that shows the current status of a transaction. The transaction
 * can be in various states and user can be coming from various locations:
 * - Just created by the first signer: and the first signer can sign and share the qr code with others
 * - Scanned from another signer's qr code: and the second signer can also sign, then either continue to forward,
 * or publish (if last one).
 * - From the transactions list (if unpublished yet): so that all signers can retrieve the qr code to share again
 *      (when the tx is published, clicking the tx shows the multisig tx details screen)
 */
@Component({
    selector: 'app-std-multisig-status',
    templateUrl: './std-multisig-status.page.html',
    styleUrls: ['./std-multisig-status.page.scss'],
})
export class StandardMultiSigStatusPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild('input', { static: false }) input: IonInput;

    constructor(
        public translate: TranslateService,
        private theme: GlobalThemeService,
        private native: Native,
        private walletService: WalletService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTheme('#732cd0', TitleBarForegroundMode.LIGHT)
        this.titleBar.setTitle('Multi-sig transaction');
    }

    ionViewDidEnter() {
    }

    ionViewWillLeave() {
        this.theme.activeTheme.subscribe((activeTheme) => {
            this.titleBar.setTitleBarTheme(activeTheme);
        });
    }

}
