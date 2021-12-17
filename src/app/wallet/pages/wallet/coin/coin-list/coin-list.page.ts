import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { Config } from '../../../../config/Config';
import { Coin, CoinType, StandardCoinName } from '../../../../model/coin';
import { MasterWallet } from '../../../../model/wallets/masterwallet';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { LocalStorage } from '../../../../services/storage.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

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
    newCoinList: EditableCoinInfo[] = null;
    coinListCache = {};
    payPassword = "";
    singleAddress = false;
    currentCoin: any;

    // Helpers
    public WalletUtil = WalletUtil;
    public SELA = Config.SELA;
    public CoinType = CoinType;

    public clickOngoing = false;

    private updateSubscription: Subscription = null;
    private destroySubscription: Subscription = null;
    private coinAddSubscription: Subscription = null;
    private coinDeleteSubscription: Subscription = null;

    private maxCountForDisplay = 300;
    private maxNewCoinCountForDisplay = 5;
    public searchKey = '';

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public walletManager: WalletService,
        public popupProvider: PopupProvider,
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
        Logger.log('wallet', 'switchCoin:', item);

        this.currentCoin = item;
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        if (item.isOpen) {
            await this.createSubWallet(item.coin);
        } else {
            await this.destroySubWallet(item.coin);
        }
    }

    async init() {
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.walletManager.activeMasterWalletId);
        this.masterWallet = this.networkWallet.masterWallet;

        this.updateSubscription = this.events.subscribe("error:update", () => {
            this.currentCoin["open"] = false;
        });
        this.destroySubscription = this.events.subscribe("error:destroySubWallet", () => {
            this.currentCoin["open"] = true;
        });
        this.coinAddSubscription = this.networkWallet.network.onCoinAdded.subscribe(() => {
            void this.refreshCoinList();
        });
        this.coinDeleteSubscription = this.networkWallet.network.onCoinDeleted.subscribe(() => {
            void this.refreshCoinList();
        });

        void this.native.hideLoading();

        await this.refreshCoinList();
    }

    private async refreshCoinList() {
        this.coinList = [];
        for (let availableCoin of await this.networkWallet.network.getAvailableCoins()) {
            const coinID = availableCoin.getID();
            // Do not show IDChain in coin list.
            if (coinID !== StandardCoinName.IDChain) {
                let isOpen = (coinID in this.networkWallet.subWallets);
                //Logger.log('wallet', availableCoin, "isOpen?", isOpen);
                this.coinList.push({ coin: availableCoin, isOpen: isOpen });
            }
        }

        this.sortCoinList();

        const lastAccessTime = this.networkWallet.network.getLastAccessTime();
        this.newCoinList = this.coinList.filter( (coin) => {
          return (coin.coin.getCreatedTime() > lastAccessTime)
        })

        const timestamp = (new Date()).valueOf();
        this.networkWallet.network.updateAccessTime(timestamp);
        Logger.log('wallet', 'coin list', this.coinList, this.newCoinList);
    }

    private sortCoinList() {
      this.coinList.sort((a, b) => {
        if (a.isOpen == b.isOpen) {
          return a.coin.getName() > b.coin.getName() ? 1 : -1;
        }
        if (a.isOpen) return -1;
        if (b.isOpen) return 1;
      })
    }

    public getShownCoinList() {
      if (this.searchKey.length === 0) {
        if (this.coinList.length > this.maxCountForDisplay) {
          return this.coinList.slice(0, this.maxCountForDisplay)
        } else {
          return this.coinList;
        }
      } else {
        const searchKey = this.searchKey.toLowerCase();
        const searchResult = this.coinList.filter((coin) => {
          return coin.coin.getName().toLowerCase().indexOf(searchKey) !== -1;
        })
        return searchResult;
      }
    }

    public getShownNewCoinList() {
        if (this.newCoinList.length > this.maxNewCoinCountForDisplay) {
            return this.newCoinList.slice(0, this.maxNewCoinCountForDisplay)
        } else {
            return this.newCoinList;
        }
    }

    async createSubWallet(coin: Coin) {
        try {
          // Create the sub Wallet (ex: IDChain)
          await this.networkWallet.createNonStandardSubWallet(coin);
          await this.native.hideLoading();
        } catch (error) {
            this.currentCoin["open"] = false; // TODO: currentCoin type
        }
    }

    async destroySubWallet(coin: Coin) {
      await this.networkWallet.removeNonStandardSubWallet(coin);
      await this.native.hideLoading();
    }

    async onSelect(item: EditableCoinInfo) {
        Logger.log('wallet', 'Toggle triggered!', item);
        this.clickOngoing = true;
        try {
          await this.switchCoin(item, item.isOpen);
        }
        catch (error) {

        }
        this.clickOngoing = false;
    }

    getCoinTitle(item: EditableCoinInfo) {
        return this.networkWallet.network.getCoinByID(item.coin.getID()).getDescription();
    }

    getCoinSubtitle(item: EditableCoinInfo) {
        return this.networkWallet.network.getCoinByID(item.coin.getID()).getName();
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
