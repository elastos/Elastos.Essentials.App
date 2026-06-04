import { Logger } from 'src/app/logger';
import { AccountAbstractionProvidersService } from 'src/app/wallet/services/account-abstraction/account-abstraction-providers.service';
import { AccountAbstractionService } from 'src/app/wallet/services/account-abstraction/account-abstraction.service';
import { AccountAbstractionTransaction } from 'src/app/wallet/services/account-abstraction/model/account-abstraction-transaction';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { Transfer } from '../../../../services/cointransfer.service';
import { AccountAbstractionMasterWallet } from '../../../masterwallets/account.abstraction.masterwallet';
import { Safe } from '../../../safes/safe';
import { SignTransactionErrorType, SignTransactionResult } from '../../../safes/safe.types';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { AnySubWallet } from '../../base/subwallets/subwallet';
import { AccountAbstractionProvider } from '../account-abstraction-provider';
import { EVMNetwork } from '../evm.network';
import { AccountAbstractionNetworkWallet } from '../networkwallets/account-abstraction.networkwallet';
import { EVMSafe } from './evm.safe';

/**
 * Safe specialized for Account Abstraction wallets
 */
export class AccountAbstractionSafe extends Safe implements EVMSafe {
  private aaProvider: AccountAbstractionProvider;
  private aaAddress: string;

  constructor(protected masterWallet: AccountAbstractionMasterWallet) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    await super.initialize(networkWallet);

    this.aaProvider = AccountAbstractionProvidersService.instance.getProviderById(this.masterWallet.getAAProviderId());

    if (!this.aaProvider) {
      throw new Error(
        `Cannot create safe, account abstraction provider with id ${this.masterWallet.getAAProviderId()} was not found.`
      );
    }

    const network = networkWallet.network as EVMNetwork;

    const controllerWallet = WalletService.instance.getMasterWallet(this.masterWallet.getControllerWalletId());

    if (!controllerWallet) {
      throw new Error(
        `Cannot create safe, controller wallet with id ${this.masterWallet.getControllerWalletId()} was not found.`
      );
    }

    const controllerNetworkWallet = await network.createNetworkWallet(controllerWallet, false);

    const controllerAccount = controllerNetworkWallet.getAddresses()[0].address;

    this.aaAddress = await this.aaProvider.getAccountAddress(controllerAccount, network.getMainChainID());

    if (!this.aaAddress) {
      throw new Error(`Cannot create safe, account abstraction address was not found.`);
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: any): string[] {
    if (startIndex === 0) {
      return [this.aaAddress];
    } else {
      return [];
    }
  }

  public createTransferTransaction(
    toAddress: string,
    amount: string,
    gasPrice: string,
    gasLimit: string,
    nonce: number
  ): Promise<AccountAbstractionTransaction> {
    // For AA, we create an AccountAbstractionTransaction object for native token transfers
    // Native transfers have no contract data, so data is '0x'
    const aaTransaction: AccountAbstractionTransaction = {
      to: toAddress,
      value: amount,
      data: '0x'
    };

    return Promise.resolve(aaTransaction);
  }

  public createContractTransaction(
    contractAddress: string,
    amount: string,
    gasPrice: string,
    gasLimit: string,
    nonce: number,
    data: any
  ): Promise<AccountAbstractionTransaction> {
    // For AA, we create an AccountAbstractionTransaction object
    // This will be passed to signAndSendRawTransaction which will handle the AA bundling
    const aaTransaction = {
      to: contractAddress,
      value: amount,
      data: data || '0x'
    };

    return Promise.resolve(aaTransaction);
  }

  public async signTransaction(
    subWallet: AnySubWallet,
    rawTx: AccountAbstractionTransaction,
    transfer: Transfer,
    forcePasswordPrompt?: boolean,
    visualFeedback?: boolean
  ): Promise<SignTransactionResult> {
    const networkWallet = subWallet.networkWallet as AccountAbstractionNetworkWallet;
    const aaProvider = networkWallet.getAccountAbstractionProvider();

    console.log('wallet', 'AA safe Signing transaction:', rawTx, transfer);

    // For AA safes, signing operation takes time, so we show a publication loader.
    // This one closes and another loader takes over whenpublishing the transaction.
    // Can probably be optimized to use a single loader...
    if (visualFeedback) {
      await AccountAbstractionService.instance.displayPublicationLoader();
    }

    // Ask the account abstraction provider specific to this account to bundle the transaction
    // and return the actual transaction hash.
    try {
      const transactionHash = await aaProvider.bundleAndSignTransaction(networkWallet, rawTx);

      return {
        signedTransaction: transactionHash
      };
    } catch (error) {
      Logger.error('wallet', 'AccountAbstractionSafe: signTransaction error:', error);

      return {
        signedTransaction: null,
        errorType: SignTransactionErrorType.FAILURE
      };
    } finally {
      if (visualFeedback) {
        await AccountAbstractionService.instance.closePublicationLoader();
      }
    }
  }

  public async signDigest(address: string, digest: string, password: string): Promise<string> {
    // Get the network wallet to access the provider
    const networkWallet = this.networkWallet as AccountAbstractionNetworkWallet;

    if (!networkWallet) {
      Logger.error('wallet', 'AccountAbstractionSafe: networkWallet is null');
      return null;
    }

    // Get the EOA controller address
    const eoaControllerNetworkWallet = await networkWallet.getControllerNetworkWallet();
    const eoaControllerAddress = eoaControllerNetworkWallet.getAddresses()[0].address;

    // Delegate to the AA provider's signDigest method
    return await this.aaProvider.signDigest(networkWallet, eoaControllerAddress, digest, password);
  }

  /**
   * Bundles a raw transaction, possibly coming from a eth_sendTransaction
   * request, into a UserOp and sends it to the bundler.
   */
  // public async signAndSendRawTx(tx: AccountAbstractionTransaction): Promise<string> {
  //   await TransactionService.instance.displayGenericPublicationLoader();

  //   TransactionService.instance.resetTransactionPublicationStatus();
  //   TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.PUBLISHING);

  //   // Ask the account abstraction provider specific to this account to bundle the transaction
  //   // and return the actual transaction hash.
  //   const transactionHash = await this.getAccountAbstractionProvider().bundleAndSignTransaction(this, tx);

  //   if (transactionHash) {
  //     TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.PUBLISHED);
  //   } else {
  //     TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.ERRORED);
  //   }

  //   return transactionHash;
  // }
}
