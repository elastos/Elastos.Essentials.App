import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { EVMNetwork } from '../../model/networks/evms/evm.network';
import { BaseAccount__factory, EntryPoint__factory, SimpleAccountFactory__factory } from './typechain';

@Injectable({
  providedIn: 'root'
})
export class AccountAbstractionService {
  public static instance: AccountAbstractionService;
  private baseAccountInterface = BaseAccount__factory.createInterface();
  private modal: HTMLIonModalElement = null;

  constructor(private modalCtrl: ModalController) {
    AccountAbstractionService.instance = this;
  }

  /**
   * Asks the entry point contract to get the nonce for a given sender.
   */
  async getNonce(network: EVMNetwork, entryPoint: string, sender: string): Promise<string> {
    const entryPointContract = EntryPoint__factory.connect(entryPoint, network.getJsonRpcProvider());
    return (await entryPointContract.getNonce(sender, 0)).toHexString();
  }

  /**
   * Asks the account contract to encode a transaction transactions.
   */
  public encodeExecute(target: string, value: string, data: string): string {
    return this.baseAccountInterface.encodeFunctionData('execute', [target, value, data]);
  }

  /**
   * Returns the init code for a AA account that is already deployed.
   */
  public getAccountInitCode(network: EVMNetwork, eoaControllerAddress: string, factoryAddress: string): string {
    const provider = network.getJsonRpcProvider();
    const salt = 0;
    const factory = SimpleAccountFactory__factory.connect(factoryAddress, provider);
    const createData = factory.interface.encodeFunctionData('createAccount', [eoaControllerAddress, salt]);
    return factoryAddress + createData.slice(2);
  }

  /**
   * Shows a blocking modal that shows the transaction status.
   */
  public async displayPublicationLoader(): Promise<void> {
    this.modal = await this.modalCtrl.create({
      // eslint-disable-next-line import/no-cycle
      component: (await import('../../components/eth-transaction/eth-transaction.component')).ETHTransactionComponent,
      componentProps: {},
      backdropDismiss: false, // Not closeable
      cssClass: 'wallet-component-base',
      id: 'evmtransactionloader'
    });

    void this.modal.onDidDismiss().then(params => {
      this.modal = null;
    });

    return this.modal.present();
  }

  public closePublicationLoader(): Promise<boolean> {
    if (this.modal) {
      return this.modal.dismiss();
    }
  }
}
