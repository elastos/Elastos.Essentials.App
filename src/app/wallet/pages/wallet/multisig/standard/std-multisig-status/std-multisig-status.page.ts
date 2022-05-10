import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Util } from 'src/app/model/util';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { AnyOfflineTransaction } from 'src/app/wallet/model/tx-providers/transaction.types';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { TransactionInfo, TransactionType } from '../../../../../model/tx-providers/transaction.types';

// TODO DELETE THIS FILE - USE COIN TX INFO


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

    public networkWallet: AnyNetworkWallet = null;
    public subWallet: AnySubWallet = null;
    public transactionInfo: TransactionInfo;

    private offlineTransaction: AnyOfflineTransaction = null;
    private publishedRawTransaction: any; // TODO type

    constructor(
        public translate: TranslateService,
        private theme: GlobalThemeService,
        private native: Native,
        private router: Router,
        private walletService: WalletService,
        private globalStartupService: GlobalStartupService
    ) {
    }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            /* let state = navigation.extras.state as MultiSigStatusParams;
            let masterWalletId = state.masterWalletId;
            this.networkWallet = this.walletService.getNetworkWalletFromMasterWalletId(masterWalletId);

            let subWalletId = state.subWalletId;
            this.subWallet = this.networkWallet.getSubWallet(subWalletId);

            this.offlineTransaction = state.offlineTransaction;

            this.prepareContent(); */
        }
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

    /**
    Both:
    - cosigners + signed status
    - amount, receiver address
    - number of required signers
    - self signing wallet

    If just created: offline tx
    - if not self signed: sign button

    If published tx:
    - tx hash, amount, tx time, confirmations, block id
    */
    private prepareContent() {
        //this.transactionInfo = this.subWallet.getTransactionInfo(this.getRawTransaction(), this.translate);
    }

    public getRawTransaction() {
        if (this.offlineTransaction)
            return this.offlineTransaction.rawTx;
        else
            return this.publishedRawTransaction;
    }

    public isIncomingTransaction(): boolean {
        return this.transactionInfo.type === TransactionType.RECEIVED
    }

    public isOutgoingTransaction(): boolean {
        return this.transactionInfo.type === TransactionType.SENT
    }

    public isTransferTransaction(): boolean {
        return this.transactionInfo.type === TransactionType.SENT
    }
}







