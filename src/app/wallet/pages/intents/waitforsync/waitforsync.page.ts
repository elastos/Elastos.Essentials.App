import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Config } from '../../../config/Config';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { StandardCoinName, CoinType } from '../../../model/Coin';
import { CurrencyService } from '../../../services/currency.service';
import { TranslateService } from '@ngx-translate/core';
import { UiService } from '../../../services/ui.service';
import { SubWallet } from '../../../model/wallets/SubWallet';
import { Util } from '../../../model/Util';
import { Router } from '@angular/router';
import { Events } from '../../../services/events.service';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';


@Component({
  selector: 'app-waitforsync',
  templateUrl: './waitforsync.page.html',
  styleUrls: ['./waitforsync.page.scss'],
})
export class WaitForSyncPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    Config = Config;
    SELA = Config.SELA;
    CoinType = CoinType;
    showOn = true;

    masterWallet: MasterWallet;
    public subWallet: SubWallet;

    chainId: StandardCoinName;
    txId: string;
    walletInfo = {};

    action = '';
    nextScreen = '';

    cancelByUser = false;

    private rootPage = false;

    private waitSubscription : Subscription = null;

    constructor(
        public native: Native,
        public events: Events,
        public zone: NgZone,
        private coinTransferService: CoinTransferService,
        private walletManager: WalletManager,
        public popupProvider: PopupProvider,
        private router: Router,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public currencyService: CurrencyService,
        public uiService: UiService,
        private globalIntentService: GlobalIntentService
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.rootPage = navigation.extras.state.rootPage;
        }
    }

    ngOnInit() {
        this.zone.run(() => {
            this.init();
        });
    }

    ionViewWillEnter() {
        this.cancelByUser = false;
        this.titleBar.setTitle(this.translate.instant('waitforsync-syncing'));
        if (!this.rootPage) {
            // TODO @chad this.appService.setBackKeyVisibility(true);
        }
    }

    async init() {
        this.chainId = this.coinTransferService.chainId;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
        this.subWallet = this.masterWallet.subWallets[this.chainId];

        Logger.log('wallet', "Wait for sync - Master wallet:", this.masterWallet, "Chain ID:", this.chainId, "SubWallet:", this.subWallet);
        Logger.log('wallet', 'Intent Transfer params', this.coinTransferService.intentTransfer);

        switch (this.coinTransferService.intentTransfer.action) {
            case 'crmembervote':
                this.action = 'text-vote-crcouncil';
                this.nextScreen = '/crmembervote';
                break;
            case 'crmemberregister':
                this.action = 'text-crmember-register';
                this.nextScreen = '/crmemberregister';
                break;
            case 'crmemberunregister':
                this.action = 'text-crmember-unregister';
                this.nextScreen = '/crmemberregister';
                break;
            case 'crmemberupdate':
                this.action = 'text-crmember-update';
                this.nextScreen = '/crmemberregister';
                break;
            case 'crmemberretrieve':
                this.action = 'text-crmember-retrieve';
                this.nextScreen = '/crmemberregister';
                break;
            case 'didtransaction':
                this.action = 'text-did';
                this.nextScreen = '/didtransaction';
                break;
            case 'esctransaction':
                this.action = 'text-esc';
                this.nextScreen = '/esctransaction';
                break;
            case 'dposvotetransaction':
                this.action = 'text-dposvote';
                this.nextScreen = '/dposvote';
                break;
            case 'pay':
                this.action = 'text-transfer';
                this.nextScreen = '/coin-transfer';
                break;
            case 'crproposalvoteagainst':
                this.action = 'Vote against proposal';
                this.nextScreen = '/crproposalvoteagainst';
                break;
            default:
                Logger.log('wallet', 'Please check the action - ' + this.action + ' is not supported.');
                break;
        }

        // TODO: remove it, IDChain is open always?
        if (this.chainId === StandardCoinName.IDChain) {
            if (!this.masterWallet.hasSubWallet(StandardCoinName.IDChain)) {
                await this.notifyNoIDChain();
                this.cancelOperation();
                return;
            }
        }

        if (this.masterWallet.subWallets[this.chainId].progress !== 100) {
            const eventType = this.masterWallet.id + ':' + this.chainId + ':synccompleted';
            this.waitSubscription = this.events.subscribe(eventType, (coin) => {
                Logger.log('wallet', 'WaitforsyncPage coin:', coin);
                this.doAction();
                this.waitSubscription.unsubscribe();
            });
        } else {
            setTimeout(() => {
                this.doAction();
            }, 1000);
        }
    }

    notifyNoIDChain() {
        return this.popupProvider.ionicAlert('confirmTitle', 'no-open-side-chain');
    }

    doAction() {
        if (!this.cancelByUser) {
          this.native.go(this.nextScreen);
        }
    }

    async cancelOperation() {
        this.cancelByUser = true;
        const intentParams =  this.coinTransferService.intentTransfer;
        await this.globalIntentService.sendIntentResponse(
            {txid: null, status: 'cancelled'},
            intentParams.intentId
        );
    }

    getLoadingDots(): string {
        let dots = '';
        setInterval(() => {
            dots += '.';
        }, 100);
        return dots;
    }
}
