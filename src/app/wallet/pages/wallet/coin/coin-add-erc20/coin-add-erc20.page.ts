import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { Native } from '../../../../services/native.service';
import { LocalStorage } from '../../../../services/storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { WalletManager } from '../../../../services/wallet.service';
import { TranslateService } from '@ngx-translate/core';
import { ERC20Coin } from '../../../../model/Coin';
import { PopupProvider } from '../../../../services/popup.service';
import { CoinService } from '../../../../services/coin.service';
import { ERC20CoinService } from '../../../../services/erc20coin.service';
import { Util } from '../../../../model/Util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { AddERCTokenRequestParams } from 'src/app/wallet/model/adderctokenrequest';
import { WalletPrefsService } from 'src/app/wallet/services/pref.service';


@Component({
    selector: 'app-coin-add-erc20',
    templateUrl: './coin-add-erc20.page.html',
    styleUrls: ['./coin-add-erc20.page.scss'],
})
export class CoinAddERC20Page implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    //public walletname: string = "";
    //public masterWallet: MasterWallet = null;
    public allCustomERC20Coins: ERC20Coin[] = [];

    // public coinAddress: string = "0xa4e4a46b228f3658e96bf782741c67db9e1ef91c"; // TEST - TTECH ERC20 on mainnet
    public coinAddress = "";
    public coinName: string = null;
    public coinSymbol: string = null;

    public coinInfoFetched = false;
    public fetchingCoinInfo = false;

    public Util = Util;

    private intentMode = false;
    private rootPage = false;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: Events,
        private walletManager: WalletManager,
        private coinService: CoinService,
        private erc20CoinService: ERC20CoinService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private popup: PopupProvider,
        private prefs: WalletPrefsService,
        private zone: NgZone,
        private router: Router,
        private globalIntentService: GlobalIntentService,
    ) {
        //this.masterWallet = this.walletManager.getMasterWallet(this.walletEditionService.modifiedMasterWalletId);
        //this.walletname = this.walletManager.masterWallets[this.masterWallet.id].name;
        this.getAllCustomERC20Coins();

        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            let params = navigation.extras.state as AddERCTokenRequestParams;
            Logger.log('wallet', "Showing add ERC token screen from intent with params:", params);

            this.intentMode = true;
            this.rootPage = true;
            this.coinAddress = params.options.address;
            this.checkCoinAddress();
            Logger.log('wallet', 'Received intent - checking coin address', this.coinAddress);
        }
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-adderc20-title"));
        if (this.intentMode) {
          this.titleBar.setNavigationMode(null);
        }
        if (this.rootPage) {
            this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
                key: "backToHome",
                iconPath: BuiltInIcon.BACK
            });
        } else {
            // TODO @chad this.appService.setBackKeyVisibility(true);
        }
    }

    ionViewWillLeave() {
        // TODO @chad this.appService.setBackKeyVisibility(false);
    }

    getAllCustomERC20Coins() {
        this.allCustomERC20Coins = this.coinService.getAvailableERC20Coins();
        Logger.log('wallet', 'All available erc20tokens', this.allCustomERC20Coins);
    }

    /**
     * Opens the scanner to get the coin address
     */
    async scanCoinAddress() {
        let res: { result: { scannedContent: string }} = await this.globalIntentService.sendIntent('https://scanner.elastos.net/scanqrcode', {});
        if (res && res.result && res.result.scannedContent) {
            this.coinAddress = res.result.scannedContent;
            Logger.log('wallet', 'Got scanned content:', this.coinAddress);
            this.checkCoinAddress();
        }
    }

    checkCoinAddress() {
        this.zone.run(() => {
            // Check if this looks like a valid address. If not, give feedback to user.
            if (!this.erc20CoinService.isAddress(this.coinAddress)) {
                void this.popup.ionicAlert("wallet.not-a-valid-address", "wallet.coin-adderc20-not-a-erc20-contract", "common.ok");
                this.coinAddress = '';
            } else {
              /*   if (this.coinAlreadyAdded(this.coinAddress)) {
                    this.native.toast_trans('coin-adderc20-alreadyadded');
                    this.coinAddress = '';
                } else {
                    this.tryFetchingCoinByAddress(this.coinAddress);
                } */

                void this.tryFetchingCoinByAddress(this.coinAddress);
            }
        });
    }

    coinAlreadyAdded(address: string): boolean {
        const targetCoin = this.allCustomERC20Coins.find((coin) => coin.getContractAddress() === address);
        if (targetCoin) {
            Logger.log('wallet', 'Address already exists', address);
            return true;
        } else {
            return false;
        }
    }

    private async tryFetchingCoinByAddress(address: string) {
        if (address !== '' && this.erc20CoinService.isAddress(address)) {
            // Coin address entered/changed: fetch its info.
            this.fetchingCoinInfo = true;
            this.coinInfoFetched = false;

            //const ethAccountAddress = await this.getEthAccountAddress();

            try {
                const contractCode = await this.erc20CoinService.isContractAddress(address);
                if (!contractCode) {
                    Logger.log('wallet', "Contract at "+address+" does not exist");
                    this.fetchingCoinInfo = false;
                    this.native.toast_trans('wallet.coin-adderc20-not-found');
                } else {
                    Logger.log('wallet', "Found contract at address " + address);
                    const coinInfo = await this.erc20CoinService.getCoinInfo(address, null /* ethAccountAddress */);

                    if(coinInfo) {
                        this.coinName = coinInfo.coinName;
                        Logger.log('wallet', "Coin name", this.coinName);

                        this.coinSymbol = coinInfo.coinSymbol;
                        Logger.log('wallet', "Coin symbol", this.coinSymbol);
                        this.coinInfoFetched = true;
                    } else {
                        Logger.warn('wallet', "Can not get the coin info - invalid contract? Not ERC20?");
                        void this.popup.ionicAlert("common.error", "wallet.coin-adderc20-invalid-contract-or-network-error", "common.ok");
                    }

                    this.fetchingCoinInfo = false;
                }
            } catch (e) {
                this.fetchingCoinInfo = false;
                Logger.log('wallet', "Contract call exception - invalid contract? Not ERC20?");
                void this.popup.ionicAlert("common.error", "wallet.coin-adderc20-invalid-contract-or-network-error", "common.ok");
            }
        }
    }

    onInputAddress(address: string) {
        this.coinInfoFetched = false;
    }

    /* private async getEthAccountAddress(): Promise<string> {
        return this.masterWallet.getSubWallet(StandardCoinName.ETHSC).createAddress();
    } */

    async addCoin() {
        if (this.coinAlreadyAdded(this.coinAddress)) {
            this.native.toast_trans('wallet.coin-adderc20-alreadyadded');
        }  else {
            const activeNetworkTemplate = this.prefs.getNetworkTemplate();
            const newCoin = new ERC20Coin(this.coinSymbol, this.coinSymbol, this.coinName, this.coinAddress, activeNetworkTemplate, true);
            await this.coinService.addCustomERC20Coin(newCoin, this.walletManager.getWalletsList());

             // Coin added - go back to the previous screen
            if (this.intentMode) {
               /*  await this.globalIntentService.sendIntentResponse(
                    this.walletEditionService.intentTransfer.action,
                    { message: this.coinName + ' added successfully', status: 'success' },
                    this.walletEditionService.intentTransfer.intentId
                ); */

                this.native.setRootRouter("/wallet/wallet-home");
            } else {
                this.native.pop();
            }
        }
    }
}
