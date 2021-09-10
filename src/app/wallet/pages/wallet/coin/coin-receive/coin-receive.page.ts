import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { StandardCoinName } from '../../../../model/coin';
import { CoinTransferService } from '../../../../services/cointransfer.service';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-receive',
    templateUrl: './coin-receive.page.html',
    styleUrls: ['./coin-receive.page.scss'],
})
export class CoinReceivePage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: NetworkWallet = null;
    private masterWalletId = '1';
    public elastosChainCode: string;
    public tokenName = '';
    public qrcode: string = null;
    public isSingleAddress = false;
    private selectSubscription: Subscription = null;

    constructor(
        public route: ActivatedRoute,
        public zone: NgZone,
        public events: Events,
        public walletManager: WalletService,
        public native: Native,
        private coinTransferService: CoinTransferService,
        public theme: GlobalThemeService,
        private translate: TranslateService,
    ) {
    }

    ngOnInit() {
        void this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-receive-title", { coinName: this.tokenName }));
    }

    ngOnDestroy() {
        if (this.selectSubscription) {
            this.selectSubscription.unsubscribe();
        }
    }

    async init(): Promise<void> {
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.elastosChainCode = this.coinTransferService.elastosChainCode;
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
        const subWallet = this.networkWallet.getSubWallet(this.elastosChainCode);
        this.tokenName = subWallet.getDisplayTokenName();

        await this.getAddress();
        this.isSingleAddressSubwallet();
    }

    isSingleAddressSubwallet() {
        if ((this.elastosChainCode === StandardCoinName.ELA) || (this.elastosChainCode === StandardCoinName.IDChain)) {
            this.isSingleAddress = this.networkWallet.masterWallet.account.SingleAddress;
        } else {
            this.isSingleAddress = true;
        }
    }

    copyAddress() {
        void this.native.copyClipboard(this.qrcode);
        this.native.toast(this.translate.instant("wallet.coin-address-copied", { coinName: this.elastosChainCode }));
    }

    async getAddress() {
        this.qrcode = await this.networkWallet.getSubWallet(this.elastosChainCode).createAddress();
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
