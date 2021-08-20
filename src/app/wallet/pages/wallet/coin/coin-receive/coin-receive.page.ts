import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WalletManager } from '../../../../services/wallet.service';
import { Native } from '../../../../services/native.service';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { TranslateService } from '@ngx-translate/core';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { StandardCoinName } from '../../../../model/Coin';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';

@Component({
    selector: 'app-coin-receive',
    templateUrl: './coin-receive.page.html',
    styleUrls: ['./coin-receive.page.scss'],
})
export class CoinReceivePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet = null;
    private masterWalletId = '1';
    public elastosChainCode: string;
    public qrcode: string = null;
    public isSingleAddress = false;
    private selectSubscription: Subscription = null;

    constructor(
        public route: ActivatedRoute,
        public zone: NgZone,
        public events: Events,
        public walletManager: WalletManager,
        public native: Native,
        private coinTransferService: CoinTransferService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
    ) {
    }

    ngOnInit() {
        this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-receive-title", { coinName: this.elastosChainCode}));
    }

    ngOnDestroy() {
        if (this.selectSubscription) {
            this.selectSubscription.unsubscribe();
        }
    }

    init() {
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.elastosChainCode = this.coinTransferService.elastosChainCode;
        this.masterWallet = this.walletManager.getMasterWallet(this.masterWalletId);

        this.getAddress();
        this.isSingleAddressSubwallet();
    }

    isSingleAddressSubwallet() {
        if ((this.elastosChainCode === StandardCoinName.ELA) || (this.elastosChainCode === StandardCoinName.IDChain)) {
            this.isSingleAddress = this.masterWallet.account.SingleAddress;
        } else {
            this.isSingleAddress = true;
        }
    }

    copyAddress() {
        this.native.copyClipboard(this.qrcode);
        this.native.toast(this.translate.instant("wallet.coin-address-copied", { coinName: this.elastosChainCode }));
    }

    async getAddress() {
        this.qrcode = await this.masterWallet.getSubWallet(this.elastosChainCode).createAddress();
        Logger.log('wallet', 'qrcode', this.qrcode);
    }

    showAddressList() {
        this.selectSubscription = this.events.subscribe('selectaddress', (address) => {
            this.zone.run(() => {
                this.qrcode = address;
            });
            this.selectSubscription.unsubscribe();
            this.selectSubscription = null;
          });
        this.native.go(
            '/wallet/coin-address',
            {
                masterWalletId: this.masterWalletId,
                elastosChainCode: this.elastosChainCode
            }
        );
    }
}
