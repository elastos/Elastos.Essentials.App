import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import BigNumber from 'bignumber.js';
import { Subject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { EssentialsWeb3Provider } from 'src/app/model/essentialsweb3provider';
import { Util } from 'src/app/model/util';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import Web3 from 'web3';
import { ETHTransactionStatus, SignedETHSCTransaction } from '../../model/networks/evms/evm.types';
import { ERC20SubWallet } from '../../model/networks/evms/subwallets/erc20.subwallet';
import type { AnyMainCoinEVMSubWallet } from '../../model/networks/evms/subwallets/evm.subwallet';
import { AnyNetwork } from '../../model/networks/network';
import { RawTransactionPublishResult } from '../../model/tx-providers/transaction.types';
import { Transfer } from '../cointransfer.service';
import { PopupProvider } from '../popup.service';

export type ETHTransactionStatusInfo = {
  chainId: string;
  gasPrice: string;
  gasLimit: string;
  status: ETHTransactionStatus;
  txId: string;
  nonce: number;
}

export type ETHTransactionSpeedup = {
  gasPrice: string;
  gasLimit: string;
  nonce: number;
}

class ETHTransactionManager {
  private checkTimes = 0;
  private waitforTimes = 20; // seconds
  private defaultGasLimit = '200000';

  constructor(
    private publicationService: EVMService,
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

  /**
   * - Shows a blocking dialog
   * - Send the signed transaction to the EVM node
   * - Checks the result and propose to speedup in case the transaction takes too much time
   * - Emit ETH transaction status events
   * 
   * @returns The publish transaction ID, if any.
   */
  public async publishTransaction(subwallet: ERC20SubWallet | AnyMainCoinEVMSubWallet, signedTransaction: string, transfer: Transfer): Promise<string> {
    try {
      await this.displayPublicationLoader();

      let result: RawTransactionPublishResult;
      try {
        let obj = JSON.parse(signedTransaction) as SignedETHSCTransaction;
        let txid = await GlobalEthereumRPCService.instance.eth_sendRawTransaction(subwallet.networkWallet.network.getMainEvmRpcApiUrl(), obj.TxSigned);

        let published = true;
        let status = 'published';
        if (!txid || txid.length == 0) {
          published = false;
          status = 'error';
        }
        result = {
          published,
          status,
          txid
        };
      }
      catch (err) {
        // err format from EVM RPC: { code: number, message: string, txid?: string }
        result = {
          published: false,
          txid: null,
          status: 'error',
          code: err.code,
          message: err.message,
        }
      }

      Logger.log('wallet', 'publishTransaction ', result)
      if (!result.published) {
        // The previous transaction needs to be accelerated.
        if (this.needToSpeedup(result)) {
          if (result.txid) {
            await this.displayPublicationLoader();

            let tx = await subwallet.getTransactionDetails(result.txid);
            let defaultGasprice = await subwallet.getGasPrice();
            let status: ETHTransactionStatusInfo = {
              chainId: subwallet.id,
              gasPrice: defaultGasprice,
              gasLimit: this.defaultGasLimit,
              status: ETHTransactionStatus.UNPACKED,
              txId: null,
              nonce: parseInt(tx.nonce),
            }
            void this.emitEthTransactionStatusChange(status);
          }
        } else {
          // 'nonce too low': The transaction already published.
          if (result.message.includes('nonce too low')) {
            let status: ETHTransactionStatusInfo = {
              chainId: subwallet.id,
              gasPrice: null,
              gasLimit: null,
              status: ETHTransactionStatus.PACKED,
              txId: null,
              nonce: -1
            }
            this.emitEthTransactionStatusChange(status);
          }
          else {
            await PopupProvider.instance.ionicAlert('wallet.transaction-fail', result.message ? result.message : '');
          }
        }
        return result.txid;
      }

      await this.displayPublicationLoader();

      const isPublishingOnGoing = await this.CheckPublishing(result)
      if (!isPublishingOnGoing) {
        Logger.warn('wallet', 'publishTransaction error ', result)

        let defaultGasprice = await subwallet.getGasPrice();
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: defaultGasprice,
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          txId: null,
          nonce: -1
        }
        void this.emitEthTransactionStatusChange(status);
        return result.txid;
      }

      this.waitforTimes = subwallet.getAverageBlocktime() * 5;
      if (this.needToSpeedup(result)) {
        let defaultGasprice = await subwallet.getGasPrice();
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: defaultGasprice,
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          txId: null,
          nonce: -1
        }
        void this.emitEthTransactionStatusChange(status);
      } else {
        setTimeout(() => {
          void this.checkPublicationStatusAndUpdate(subwallet, result.txid);
        }, 5000);
      }

      return result.txid;
    }
    catch (err) {
      Logger.error('wallet', 'publishTransaction error:', err)
    }
  }

  private async CheckPublishing(result: RawTransactionPublishResult) {
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

      // The previous transaction is pending.
      if (result.message.includes('known transaction')) {
        // Get the txid
        let txid = result.message.replace('known transaction:', '').trim();
        result.txid = txid.startsWith('0x') ? txid : '0x' + txid;
        return true;
      }

      // 'insufficient funds for gas * price + value'
      return false;
    } else {
      return false
    }
  }

  private async checkPublicationStatusAndUpdate(subwallet: ERC20SubWallet | AnyMainCoinEVMSubWallet, txid: string): Promise<void> {
    let result = await subwallet.getTransactionDetails(txid);
    Logger.log('wallet', 'checkPublicationStatusAndUpdate ', result)
    if (result.blockHash) {
      let status: ETHTransactionStatusInfo = {
        chainId: subwallet.id,
        gasPrice: result.gasPrice,
        gasLimit: this.defaultGasLimit,
        status: ETHTransactionStatus.PACKED,
        txId: txid,
        nonce: parseInt(result.nonce)
      }
      this.emitEthTransactionStatusChange(status);
    } else {
      this.checkTimes++;
      if (this.checkTimes < this.waitforTimes) {
        setTimeout(() => {
          void this.checkPublicationStatusAndUpdate(subwallet, txid);
        }, 1000);
      } else {
        let status: ETHTransactionStatusInfo = {
          chainId: subwallet.id,
          gasPrice: Util.ceil(parseInt(result.gasPrice) * 1.2).toString(),
          gasLimit: this.defaultGasLimit,
          status: ETHTransactionStatus.UNPACKED,
          nonce: parseInt(result.nonce),
          txId: txid
        }
        this.emitEthTransactionStatusChange(status);
      }
    }
  }

  /**
   * Shows a blocking modal that shows the transaction status.
   *
   * TODO: MAKE A SIMILAR COMPONENT DIALOG FOR OTHER NETWORK, SAME UI
   */
  public async displayPublicationLoader(): Promise<void> {

    const modal = await this.modalCtrl.create({
      // eslint-disable-next-line import/no-cycle
      component: (await import('../../components/eth-transaction/eth-transaction.component')).ETHTransactionComponent,
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
export class EVMService {
  public static instance: EVMService = null;

  private manager: ETHTransactionManager = null;

  // Cached web3 instances per network
  private web3s: {
    [networkName: string]: Web3;
  } = {}

  public ethTransactionStatus: Subject<ETHTransactionStatusInfo> = null;
  public ethTransactionSpeedup: Subject<ETHTransactionSpeedup> = null;

  constructor(
    private modalCtrl: ModalController,
  ) {
    EVMService.instance = this;

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

  public publishTransaction(subwallet: ERC20SubWallet | AnyMainCoinEVMSubWallet, transaction: string, transfer: Transfer): Promise<string> {
    return this.manager.publishTransaction(subwallet, transaction, transfer);
  }

  /**
   * Creates a new Web3 instance or return a cached one, for the given network.
   */
  public getWeb3(network: AnyNetwork): Web3 {
    if (network.name in this.web3s) {
      return this.web3s[network.name];
    }
    else {
      let web3 = new Web3(new EssentialsWeb3Provider(network.getMainEvmRpcApiUrl()));
      this.web3s[network.name] = web3;
      return web3;
    }
  }

  /**
   * Current gas price on given network, in raw token amount
   */
  public async getGasPrice(network: AnyNetwork): Promise<string> {
    let web3 = this.getWeb3(network);
    let gasPrice = await web3.eth.getGasPrice();
    return gasPrice;
  }

  /**
   * Get the current nonce for an account address, on the main node in use for a given network.
   */
  public async getNonce(network: AnyNetwork, accountAddress: string): Promise<number> {
    try {
      let nonce = await GlobalEthereumRPCService.instance.getETHSCNonce(network.getMainEvmRpcApiUrl(), accountAddress);
      return nonce;
    }
    catch (err) {
      Logger.error('wallet', 'Failed to get nonce', network, accountAddress, err);
    }

    return -1;
  }

  /**
   * Cost of any transfer, based on a given gas limit and gas price, in readable native coin amount.
   */
  public getTransactionFees(gasLimit: string, gasPrice: string): BigNumber {
    let tokenAmountMulipleTimes = new BigNumber(10).pow(18); // Native coins are all 18 decimals
    let transactionFees = new BigNumber(gasLimit).multipliedBy(gasPrice).dividedBy(tokenAmountMulipleTimes);
    return transactionFees;
  }

  /**
   * Cost of a native coin transfer, in readable native coin amount.
   */
  public async estimateTransferTransactionFees(network: AnyNetwork): Promise<BigNumber> {
    let gasLimit = "21000"; // All EVM seem to use this amount of gas for native coin transfer
    let gasPrice = await this.getWeb3(network).eth.getGasPrice();
    return this.getTransactionFees(gasLimit, gasPrice);
  }

  public isAddress(network: AnyNetwork, address: string) {
    return this.getWeb3(network).utils.isAddress(address);
  }

  public async isContractAddress(network: AnyNetwork, address: string) {
    const contractCode = await this.getWeb3(network).eth.getCode(address);
    return contractCode === '0x' ? false : true;
  }

}
