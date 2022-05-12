import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from '../logger';
import { App } from '../model/app.enum';
import { Config } from '../wallet/config/Config';
import { StandardCoinName } from '../wallet/model/coin';
import { Utxo } from '../wallet/model/providers/transaction.types';
import { MainAndIDChainSubWallet } from '../wallet/model/wallets/elastos/mainandidchain.subwallet';
import { NetworkWallet } from '../wallet/model/wallets/networkwallet';
import { WalletNetworkService } from '../wallet/services/network.service';
import { WalletService } from '../wallet/services/wallet.service';
import { IdentityEntry } from './global.didsessions.service';
import { GlobalLanguageService } from './global.language.service';
import { GlobalNotificationsService } from './global.notifications.service';
import { GlobalPopupService } from './global.popup.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';


@Injectable({
  providedIn: 'root'
})
export class GlobalELAUtxoService extends GlobalService {
  private activeWalletSubscription: Subscription = null;
  private activeNetworkSubscription: Subscription = null;

  private activeNetworkWallet: NetworkWallet = null;
  private mainChainSubwallet: MainAndIDChainSubWallet = null;

  private fetchUtxoTimer: any = null;

  constructor(
    private walletNetworkService: WalletNetworkService,
    private walletManager: WalletService,
    public globalPopupService: GlobalPopupService,
  ) {
    super();
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // NOTE: called when the network changes as well, as a new "network wallet" is created.
    this.activeWalletSubscription = this.walletManager.activeNetworkWallet.subscribe(activeWallet => {
        if (activeWallet) { // null value when essentials starts, while wallets are not yet initialized.
            this.activeNetworkWallet = activeWallet;
            this.restartCheckELAUtxosTimeout();
        }
    });

    this.activeNetworkSubscription = this.walletNetworkService.activeNetwork.subscribe( activeNetwork => {
        if (activeNetwork) {
            this.restartCheckELAUtxosTimeout();
        }
    })

    return;
  }

  onUserSignOut(): Promise<void> {
    if (this.fetchUtxoTimer) {
        clearTimeout(this.fetchUtxoTimer);
        this.fetchUtxoTimer = null;
    }

    if (this.activeWalletSubscription) {
        this.activeWalletSubscription.unsubscribe();
    }

    if (this.activeNetworkSubscription) {
        this.activeNetworkSubscription.unsubscribe();
    }
    return;
  }

  private restartCheckELAUtxosTimeout() {
    if (!this.activeNetworkWallet) return;

    if (this.fetchUtxoTimer) {
        clearTimeout(this.fetchUtxoTimer);
        this.fetchUtxoTimer = null;
    }

    if (this.walletNetworkService.isActiveNetworkElastos()) {
        this.mainChainSubwallet = this.activeNetworkWallet.getSubWallet(StandardCoinName.ELA) as MainAndIDChainSubWallet;
        this.fetchUtxoTimer = setTimeout(() => {
            void this.checkELAUtxos();
        }, 30000);
    } else {
        this.mainChainSubwallet = null;
    }
  }

  private async checkELAUtxos() {
    let normalUxtos: Utxo[] = null;
    let utxosCount = -1;
    try {
        normalUxtos = await this.getNormalUtxos();
        if (normalUxtos) utxosCount = normalUxtos.length;
    } catch (err) {
        Logger.warn('wallet', ' getNormalUtxos error', err)
    }

    if (utxosCount > Config.UTXO_CONSOLIDATE_PROMPT_THRESHOLD) {
        const message = GlobalLanguageService.instance.translate('wallet.notification-too-many-utxos',
            { walletname: this.activeNetworkWallet.masterWallet.name, count: utxosCount });
        this.sendNotification(message);
    }
  }

  // We don't consolidate the utxos for voting.
  public async getNormalUtxos() {
    let normalUxtos: Utxo[] = null;
    if (!this.mainChainSubwallet) {
        Logger.warn('GlobalELAUtxoService', 'Not ela mainchain network, do not need to check the utxo!');
        return null;
    }

    try {
        normalUxtos = await this.mainChainSubwallet.getNormalUtxos();
    } catch (err) {
        Logger.warn('GlobalELAUtxoService', ' getNormalUtxos error', err)
    }
    return normalUxtos;
  }

  private sendNotification(message: string) {
    const notification = {
      app: App.WALLET,
      key: 'consolidateutxo-' + this.activeNetworkWallet.masterWallet.id,
      title: GlobalLanguageService.instance.translate('wallet.wallet-settings-consolidate-utxos'),
      message: message,
      url: '/wallet/wallet-settings'
    };
    void GlobalNotificationsService.instance.sendNotification(notification);
  }
}
