import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AddERCTokenRequestParams } from 'src/app/wallet/model/networks/evms/adderctokenrequest';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { WalletPrefsService } from 'src/app/wallet/services/pref.service';
import { ERC20Coin } from '../../../../model/coin';
import { ERC20CoinService } from '../../../../services/evm/erc20coin.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { LocalStorage } from '../../../../services/storage.service';
import { WalletService } from '../../../../services/wallet.service';


@Component({
    selector: 'app-coin-add-erc20',
    templateUrl: './coin-add-erc20.page.html',
    styleUrls: ['./coin-add-erc20.page.scss'],
})
export class CoinAddERC20Page implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public networkWallet: AnyNetworkWallet = null;
    private network: EVMNetwork = null;
    public allCustomERC20Coins: ERC20Coin[] = [];

    // public coinAddress: string = "0xa4e4a46b228f3658e96bf782741c67db9e1ef91c"; // TEST - TTECH ERC20 on mainnet
    public coinAddress = "";
    public coinName: string = null;
    public coinSymbol: string = null;
    private coinDecimals = -1;

    public coinInfoFetched = false;
    public fetchingCoinInfo = false;

    private intentMode = false;
    private rootPage = false;

    constructor(
        public route: ActivatedRoute,
        public native: Native,
        public localStorage: LocalStorage,
        public events: GlobalEvents,
        private walletManager: WalletService,
        private erc20CoinService: ERC20CoinService,
        private evmService: EVMService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private popup: PopupProvider,
        private prefs: WalletPrefsService,
        private zone: NgZone,
        private router: Router,
        private globalIntentService: GlobalIntentService,
    ) {
        this.networkWallet = this.walletManager.getActiveNetworkWallet();
        this.network = <EVMNetwork>this.networkWallet.network;
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
        this.allCustomERC20Coins = this.network.getAvailableERC20Coins();
        Logger.log('wallet', 'All available erc20tokens', this.allCustomERC20Coins);
    }

    /**
     * Opens the scanner to get the coin address
     */
    async scanCoinAddress() {
        let res: { result: { scannedContent: string } } = await this.globalIntentService.sendIntent('https://scanner.elastos.net/scanqrcode', {});
        if (res && res.result && res.result.scannedContent) {
            this.coinAddress = res.result.scannedContent;
            Logger.log('wallet', 'Got scanned content:', this.coinAddress);
            this.checkCoinAddress();
        }
    }

    checkCoinAddress() {
        void this.zone.run(async () => {
            this.coinAddress = this.coinAddress.toLowerCase()

            // Check if this looks like a valid address. If not, give feedback to user.
            if (!(await this.evmService.isAddress(this.networkWallet.network, this.coinAddress))) {
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
        if (address !== '' && await this.evmService.isAddress(this.networkWallet.network, address)) {
            // Coin address entered/changed: fetch its info.
            this.fetchingCoinInfo = true;
            this.coinInfoFetched = false;

            //const ethAccountAddress = await this.getEthAccountAddress();

            try {
                const contractCode = await this.evmService.isContractAddress(this.networkWallet.network, address);
                if (!contractCode) {
                    Logger.log('wallet', "Contract at " + address + " does not exist");
                    this.fetchingCoinInfo = false;
                    this.native.toast_trans('wallet.coin-adderc20-not-found');
                } else {
                    Logger.log('wallet', "Found contract at address " + address);
                    const coinInfo = await this.erc20CoinService.getCoinInfo(this.networkWallet.network, address);

                    if (coinInfo) {
                        this.coinName = coinInfo.coinName;
                        Logger.log('wallet', "Coin name", this.coinName);

                        this.coinSymbol = coinInfo.coinSymbol;
                        Logger.log('wallet', "Coin symbol", this.coinSymbol);
                        this.coinDecimals = coinInfo.coinDecimals;

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
        return this.masterWallet.getSubWallet(StandardCoinName.ETHSC).getCurrentReceiverAddress();
    } */

    async addCoin() {
        if (this.coinAlreadyAdded(this.coinAddress)) {
            this.native.toast_trans('wallet.coin-adderc20-alreadyadded');
        } else {
            const activeNetworkTemplate = this.prefs.getNetworkTemplate();
            const newCoin = new ERC20Coin(this.coinSymbol, this.coinName, this.coinAddress, this.coinDecimals, activeNetworkTemplate, true);
            await this.network.addCustomERC20Coin(newCoin);

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
