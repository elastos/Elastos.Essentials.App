import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnyNetworkWallet, WalletAddressInfo } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { ElastosMainChainStandardNetworkWallet } from 'src/app/wallet/model/networks/elastos/mainchain/networkwallets/standard/mainchain.networkwallet';
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

    public networkWallet: AnyNetworkWallet = null;
    private masterWalletId = '1';
    public subWalletId: string;
    private subWallet: AnySubWallet = null;
    public tokenName = '';
    public qrcode: string = null;
    public isSingleAddress = false;
    public walletAddressInfo: WalletAddressInfo[] = [];
    public addressType = 0;
    private selectSubscription: Subscription = null;

    constructor(
        public route: ActivatedRoute,
        public zone: NgZone,
        public events: GlobalEvents,
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
        this.subWalletId = this.coinTransferService.subWalletId;
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId);
        this.subWallet = this.networkWallet.getSubWallet(this.subWalletId);
        this.tokenName = this.subWallet.getDisplayTokenName();

        this.getAddress();
        this.isSingleAddressSubwallet();
    }

    isSingleAddressSubwallet() {
        if (this.subWalletId === StandardCoinName.ELA) {
            let elastosMainChainMasterWallet = this.networkWallet as ElastosMainChainStandardNetworkWallet;
            this.isSingleAddress = elastosMainChainMasterWallet.getNetworkOptions().singleAddress;
        } else {
            this.isSingleAddress = true;
        }
    }

    copyAddress() {
        void this.native.copyClipboard(this.qrcode);
        this.native.toast(this.translate.instant("common.copied-to-clipboard"));
    }

    async getAddress() {
        this.walletAddressInfo = this.networkWallet.getAddresses();

        this.setAddressType(0);
    }

    setAddressType(type: number) {
        this.addressType = type;
        this.qrcode = this.walletAddressInfo[type].address;
        Logger.log('wallet', 'Address', this.qrcode);
    }

    showAddressList() {
        if (!this.selectSubscription) {
            this.selectSubscription = this.events.subscribe('selectaddress', (address) => {
                this.zone.run(() => {
                    this.qrcode = address;
                });
            });
        }
        this.native.go(
            '/wallet/coin-address',
            {
                masterWalletId: this.masterWalletId,
                subWalletId: this.subWalletId
            }
        );
    }
}
