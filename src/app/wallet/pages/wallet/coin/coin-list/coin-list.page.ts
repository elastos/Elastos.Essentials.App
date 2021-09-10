import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Config } from '../../../../config/Config';
import { LocalStorage } from '../../../../services/storage.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider} from '../../../../services/popup.service';
import { WalletService } from '../../../../services/wallet.service';
import { MasterWallet } from '../../../../model/wallets/masterwallet';
import { Coin, CoinType, StandardCoinName } from '../../../../model/Coin';
import { CoinService } from '../../../../services/coin.service';
import { WalletEditionService } from '../../../../services/walletedition.service';
import { Util } from '../../../../model/util';
import { TranslateService } from '@ngx-translate/core';
import { UiService } from '../../../../services/ui.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';

type EditableCoinInfo = {
    coin: Coin,
    isOpen: boolean
};

@Component({
    selector: 'app-coin-list',
    templateUrl: './coin-list.page.html',
    styleUrls: ['./coin-list.page.scss'],
})

export class CoinListPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    masterWallet: MasterWallet = null;
    networkWallet: NetworkWallet = null;
    coinList: EditableCoinInfo[] = null;
    coinListCache = {};
    payPassword = "";
    singleAddress = false;
    currentCoin: any;

    // Helpers
    public Util = Util;
    public SELA = Config.SELA;
    public CoinType = CoinType;

    private updateSubscription: Subscription = null;
    private destroySubscription: Subscription = null;
    private coinAddSubscription: Subscription = null;
    private coinDeleteSubscription: Subscription = null;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public walletManager: WalletService,
        public popupProvider: PopupProvider,
        private coinService: CoinService,
        private walletEditionService: WalletEditionService,
        public native: Native,
        public localStorage: LocalStorage,
        public modalCtrl: ModalController,
        public events: Events,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public currencyService: CurrencyService,
        public uiService: UiService
    ) {
    }

    ngOnInit() {
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (menuIcon: TitleBarIcon) => {
            if (menuIcon.key == "add-erc20-coin")
                this.handleOnAddECR20Coin();
        });
    }

    unsubscribe(subscription: Subscription) {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    }

    ngOnDestroy() {
        this.unsubscribe(this.updateSubscription);
        this.unsubscribe(this.destroySubscription);
        this.unsubscribe(this.coinAddSubscription);
        this.unsubscribe(this.coinDeleteSubscription);

        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.coin-list-title"));

        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "add-erc20-coin",
            iconPath: BuiltInIcon.ADD
        });

        void this.init();
    }

    ionViewWillLeave() {
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);

        if (this.popupProvider.alertPopup) {
            void this.popupProvider.alertCtrl.dismiss();
            this.popupProvider.alertPopup = null;
        }
    }

    async switchCoin(item: EditableCoinInfo, open: boolean) {
        item.isOpen = open;
        Logger.log('wallet', item);

        this.currentCoin = item;
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        if (item.isOpen) {
            await this.createSubWallet(item.coin);
        } else {
            await this.destroySubWallet(item.coin);
        }
    }

    async init() {
        this.updateSubscription = this.events.subscribe("error:update", () => {
            this.currentCoin["open"] = false;
        });
        this.destroySubscription = this.events.subscribe("error:destroySubWallet", () => {
            this.currentCoin["open"] = true;
        });
        this.coinAddSubscription = this.events.subscribe("custom-coin-added", () => {
            void this.refreshCoinList();
        });
        this.coinDeleteSubscription = this.events.subscribe("custom-coin-deleted", () => {
            void this.refreshCoinList();
        });

        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.walletEditionService.modifiedMasterWalletId);
        this.masterWallet = this.networkWallet.masterWallet;

        void this.native.hideLoading();

        await this.refreshCoinList();
    }

    private async refreshCoinList() {
        this.coinList = [];
        for (let availableCoin of await this.coinService.getAvailableCoins()) {
            const coinID = availableCoin.getID();
            // Do not show IDChain in coin list.
            if (coinID !== StandardCoinName.IDChain) {
              let isOpen = (coinID in this.networkWallet.subWallets);
              //Logger.log('wallet', availableCoin, "isOpen?", isOpen);
              this.coinList.push({ coin: availableCoin, isOpen: isOpen });
            }
        }
        Logger.log('wallet', 'coin list', this.coinList);
    }

    async createSubWallet(coin: Coin) {
        try {
            void this.native.hideLoading();

            // Create the sub Wallet (ex: IDChain)
            await this.networkWallet.createNonStandardSubWallet(coin);
        } catch (error) {
            this.currentCoin["open"] = false; // TODO: currentCoin type
        }
    }

    async destroySubWallet(coin: Coin) {
        void this.native.hideLoading();

        await this.networkWallet.removeNonStandardSubWallet(coin);
    }

    onSelect(item: EditableCoinInfo) {
        Logger.log('wallet', 'Toggle triggered!', item);
        void this.switchCoin(item, item.isOpen);
    }

    getCoinTitle(item: EditableCoinInfo) {
        return CoinService.instance.getCoinByID(item.coin.getID()).getDescription();
    }

    getCoinSubtitle(item: EditableCoinInfo) {
        return CoinService.instance.getCoinByID(item.coin.getID()).getName();
    }

    getCoinIcon(item: EditableCoinInfo) {
        switch (item.coin.getID()) {
            case 'ELA':
                return "assets/wallet/coins/ela-black.svg";
            case 'IDChain':
                return "assets/wallet/coins/ela-turquoise.svg";
            case 'ETHSC':
                return "assets/wallet/coins/ela-gray.svg";
            default:
                return "assets/wallet/coins/eth-purple.svg";
        }
    }

    // User wants to add a new ERC20 token of his own to the available list of tokens.
    private handleOnAddECR20Coin() {
        this.native.go("/wallet/coin-add-erc20");
    }

    public goToCoinDetails(item: EditableCoinInfo) {
        if (item.coin.getType() === CoinType.ERC20) {
            this.native.go('/wallet/coin-erc20-details', { coin: item.coin });
        }
    }
}
