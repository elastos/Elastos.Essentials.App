import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { ETHTransactionComponent } from '../components/eth-transaction/eth-transaction.component';
import { ETHTransactionStatus } from '../model/evm.types';
import { RawTransactionPublishResult } from '../model/providers/transaction.types';
import { StandardEVMSubWallet } from '../model/wallets/evm.subwallet';
import { Transfer } from './cointransfer.service';

export type ETHTransactionStatusInfo = {
  chainId: string;
  gasPrice: string;
  gasLimit: string;
  status: ETHTransactionStatus;
  txId: string;
}

export type ETHTransactionSpeedup = {
  gasPrice: string;
  gasLimit: string;
}

class ETHTransactionManager {
  private checkTimes = 0;
  private defaultGasLimit = '200000';

  constructor(
    private publicationService: ETHTransactionService,
    private modalCtrl: ModalController,
  ) { }

  /**
  * Emit a public publication status event.
  */
  public emitEthTransactionStatusChange(status) {
    this.publicationService.ethTransactionStatus.next(status);
    void this.resetStatus();
  }

  public resetStatus() {
    this.checkTimes = 0;
  }

  public async publishTransaction(subwallet: StandardEVMSubWallet, transaction: string, transfer: Transfer, showBlockingLoader = false) {
    if (showBlockingLoader) {
      await this.displayPublicationLoader();
    }

    try {
      let result = await subwallet.signAndSendRawTransaction(transaction, transfer, false);
      Logger.log('wallet', 'publishTransaction ', result)
      const isPuiblishOnging = await this.CheckPulbishing(result)
      if (!isPuiblishOnging) {
        Logger.warn('wallet', 'publishTransaction error')

        let defaultGasprice = await subwallet.getGasPrice();
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: defaultGasprice,
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          txId: null
        }
        void this.emitEthTransactionStatusChange(status);
        return;
      }
      if (this.needToSpeedup(result)) {
        let defaultGasprice = await subwallet.getGasPrice();
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: defaultGasprice,
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          txId: null
        }
        void this.emitEthTransactionStatusChange(status);
      } else {
        setTimeout(() => {
          void this.checkPublicationStatusAndUpdate(subwallet, result.txid);
        }, 3000);
      }
    }
    catch (err) {
      Logger.error('wallet', 'publishTransaction error:', err)
    }
  }

  private async CheckPulbishing(result: RawTransactionPublishResult) {
    if (result.message) {
        if (result.message.includes('insufficient funds for gas * price + value')) {
            await this.modalCtrl.dismiss();
            return false;
        }
    }

    return true;
  }

  private needToSpeedup(result: RawTransactionPublishResult) {
    if ((result.published === false) && (result.message)) {
      // Use code == -32000 ?
      if (result.message.includes('replacement transaction underpriced')) {
        return true;
      }

      if (result.message.includes('known transaction')) {
        return true;
      }

      // 'insufficient funds for gas * price + value'
      return false;
    } else {
      return false
    }
  }

  private async checkPublicationStatusAndUpdate(subwallet: StandardEVMSubWallet, txid: string): Promise<void> {
    let result = await subwallet.getTransactionDetails(txid);
    Logger.log('wallet', 'checkPublicationStatusAndUpdate ', result)
    if (result.blockHash) {
      let status: ETHTransactionStatusInfo = {
        chainId: subwallet.id,
        gasPrice: result.gasPrice,
        gasLimit: this.defaultGasLimit,
        status: ETHTransactionStatus.PACKED,
        txId: txid
      }
      this.emitEthTransactionStatusChange(status);
    } else {
      this.checkTimes++;
      if (this.checkTimes < 15) {
        setTimeout(() => {
          void this.checkPublicationStatusAndUpdate(subwallet, txid);
        }, 1000);
      } else {
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: result.gasPrice,
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          txId: txid
        }
        this.emitEthTransactionStatusChange(status);
      }
    }
  }

  /**
   * Shows a blocking modal that shows the transaction status.
   */
  public async displayPublicationLoader(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ETHTransactionComponent,
      componentProps: {},
      backdropDismiss: false, // Not closeable
      cssClass: "wallet-component-base"
    });

    void modal.onDidDismiss().then((params) => {
      //
    });

    void modal.present();
  }
}

@Injectable({
  providedIn: 'root'
})
export class ETHTransactionService {
  public static instance: ETHTransactionService = null;

  private manager: ETHTransactionManager = null;

  public ethTransactionStatus: Subject<ETHTransactionStatusInfo> = null;
  public ethTransactionSpeedup: Subject<ETHTransactionSpeedup> = null;

  constructor(
    private modalCtrl: ModalController,
  ) {
    ETHTransactionService.instance = this;

    this.manager = new ETHTransactionManager(
      this,
      this.modalCtrl);
  }

  public init(): void {
    this.ethTransactionStatus = new Subject<ETHTransactionStatusInfo>();
    this.ethTransactionSpeedup = new Subject<ETHTransactionSpeedup>();
  }

  public resetStatus(): void {
    this.manager.resetStatus();
  }

  public publishTransaction(subwallet: StandardEVMSubWallet, transaction: string, transfer: Transfer, showBlockingLoader = false): Promise<void> {
    return this.manager.publishTransaction(subwallet, transaction, transfer, showBlockingLoader);
  }
}
