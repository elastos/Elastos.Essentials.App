import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from '../logger';
import { App } from '../model/app.enum';
import { IdentityEntry } from "../model/didsessions/identityentry";
import { AnyNetworkWallet } from '../wallet/model/networks/base/networkwallets/networkwallet';
import { EscSubWallet } from '../wallet/model/networks/elastos/evms/esc/subwallets/esc.evm.subwallet';
import { WalletNetworkService } from '../wallet/services/network.service';
import { WalletService } from '../wallet/services/wallet.service';
import { GlobalLanguageService } from './global.language.service';
import { GlobalNotificationsService } from './global.notifications.service';
import { GlobalPopupService } from './global.popup.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';


@Injectable({
  providedIn: 'root'
})
export class GlobalESCBPoSNFTService extends GlobalService {
  private activeWalletSubscription: Subscription = null;
  private activeNetworkSubscription: Subscription = null;

  private activeNetworkWallet: AnyNetworkWallet = null;
  private escSubwallet: EscSubWallet = null;

  private getClaimableNFTTimer: any = null;

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
      // the activeWallet is null if the wallet is not yet initialized or user delete the wallet.
      this.activeNetworkWallet = activeWallet;
      this.restartCheckESCBPoSNFTTimeout();
    });

    this.activeNetworkSubscription = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
      if (activeNetwork) {
        this.restartCheckESCBPoSNFTTimeout();
      }
    })

    return;
  }

  onUserSignOut(): Promise<void> {
    if (this.getClaimableNFTTimer) {
      clearTimeout(this.getClaimableNFTTimer);
      this.getClaimableNFTTimer = null;
    }

    if (this.activeWalletSubscription) {
      this.activeWalletSubscription.unsubscribe();
    }

    if (this.activeNetworkSubscription) {
      this.activeNetworkSubscription.unsubscribe();
    }
    return;
  }

  private restartCheckESCBPoSNFTTimeout() {
    if (this.getClaimableNFTTimer) {
      clearTimeout(this.getClaimableNFTTimer);
      this.getClaimableNFTTimer = null;
    }

    if (!this.activeNetworkWallet) return;

    if (this.walletNetworkService.activeNetwork.value.key === 'elastossmartchain') {
      this.escSubwallet = this.activeNetworkWallet.getMainEvmSubWallet() as unknown as EscSubWallet;
      if (this.escSubwallet.getUnClaimedTxs().length > 0) {
        this.getClaimableNFTTimer = setTimeout(() => {
          void this.checkEscBPoSNFT();
        }, 20000);
      }
    } else {
      this.escSubwallet = null;
    }
  }

  private async checkEscBPoSNFT() {
    try {
      let claimableTxs = await this.escSubwallet.getClaimableTxs();
      if (claimableTxs.length > 0) {
        this.sendNotification(claimableTxs.length);
      } else {
        this.deletePreviousNotification();
      }
    } catch (err) {
      Logger.warn('GlobalESCBPoSNFTService', ' getClaimableTxs error', err)
    }
  }

  private sendNotification(claimableNFTCount: number) {
    let message;
    if (claimableNFTCount == 1) {
      message = GlobalLanguageService.instance.translate('wallet.notification-found-one-claimable-nft',
      { walletname: this.escSubwallet.masterWallet.name })
    } else {
      message = GlobalLanguageService.instance.translate('wallet.notification-found-claimable-nft',
      { walletname: this.escSubwallet.masterWallet.name, count: claimableNFTCount })
    }
    const notification = {
      app: App.WALLET,
      key: 'claimable-nft-' + this.escSubwallet.masterWallet.id,
      title: GlobalLanguageService.instance.translate('wallet.wallet-settings-bpos-nft'),
      message: message,
      url: '/wallet/coin-bpos-nft'
    };
    void GlobalNotificationsService.instance.sendNotification(notification);
  }

  private deletePreviousNotification() {
    let key = 'claimable-nft-' + this.escSubwallet.masterWallet.id;
    let notifications = GlobalNotificationsService.instance.getNotifications();
    let nftNotifications = notifications.filter(notification => notification.key === key);
    if (nftNotifications.length > 0)
      void GlobalNotificationsService.instance.clearNotification(nftNotifications[0].notificationId);
  }
}
