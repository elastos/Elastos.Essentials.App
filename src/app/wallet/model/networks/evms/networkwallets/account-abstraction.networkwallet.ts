import { Logger } from 'src/app/logger';
import { AccountAbstractionService } from 'src/app/wallet/services/account-abstraction/account-abstraction.service';
import { UserOperation } from 'src/app/wallet/services/account-abstraction/model/user-operation';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { AccountAbstractionProvidersService } from '../../../../services/account-abstraction/account-abstraction-providers.service';
import { AccountAbstractionMasterWallet } from '../../../masterwallets/account.abstraction.masterwallet';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { Safe } from '../../../safes/safe';
import { AnyNetworkWallet, WalletAddressInfo } from '../../base/networkwallets/networkwallet';
import { AnySubWallet } from '../../base/subwallets/subwallet';
import { AccountAbstractionProvider } from '../account-abstraction-provider';
import type { EVMNetwork } from '../evm.network';
import { AccountAbstractionSafe } from '../safes/account-abstraction.safe';
import { MainCoinEVMSubWallet } from '../subwallets/evm.subwallet';
import { EVMNetworkWallet } from './evm.networkwallet';

/**
 * Network wallet type for Account Abstraction wallets on EVM networks
 */
export abstract class AccountAbstractionNetworkWallet extends EVMNetworkWallet<
  AccountAbstractionMasterWallet,
  WalletNetworkOptions
> {
  // Store the AA provider and AA address
  protected aaProvider: AccountAbstractionProvider = null;

  constructor(
    masterWallet: AccountAbstractionMasterWallet,
    public network: EVMNetwork,
    safe: Safe,
    displayToken: string,
    mainSubWalletFriendlyName: string,
    public averageBlocktime = 5
  ) {
    super(masterWallet, network, safe, displayToken, mainSubWalletFriendlyName);
  }

  public async initialize(): Promise<void> {
    await super.initialize();

    // Initialize the AA provider and save as variable
    this.aaProvider = AccountAbstractionProvidersService.instance.getProviderById(this.masterWallet.getAAProviderId());
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    // Create the main token subwallet (ETH, BSC, etc.)
    this.mainTokenSubWallet = new MainCoinEVMSubWallet(this, this.masterWallet.id, this.mainSubWalletFriendlyName);

    // Add both subwallets
    this.subWallets[this.mainTokenSubWallet.id] = this.mainTokenSubWallet;

    return await void 0;
  }

  public getAddresses(): WalletAddressInfo[] {
    const safe = this.safe as AccountAbstractionSafe;
    const addresses: WalletAddressInfo[] = [
      {
        title: 'EVM',
        address: safe.getAddresses(0, 1, false, AddressUsage.DEFAULT)[0]
      }
    ];

    return addresses;
  }

  public async convertAddressForUsage(address: string, usage: AddressUsage): Promise<string> {
    return (await address.startsWith('0x')) ? address : '0x' + address;
  }

  public async publishTransaction(
    subWallet: AnySubWallet,
    signedUserOp: UserOperation,
    visualFeedback: boolean
  ): Promise<string> {
    // Show publication popup
    if (visualFeedback) {
      await AccountAbstractionService.instance.displayPublicationLoader();
    }

    // Publish transaction
    try {
      const txid = await this.getAccountAbstractionProvider().publishTransaction(this, signedUserOp);
      return txid;
    } catch (error) {
      Logger.error('wallet', 'AccountAbstractionNetworkWallet: publishTransaction error:', error);
      throw error;
    } finally {
      // Close publication popup
      if (visualFeedback) {
        await AccountAbstractionService.instance.closePublicationLoader();
      }
    }
  }

  public getMainEvmSubWallet(): MainCoinEVMSubWallet<WalletNetworkOptions> {
    return this.mainTokenSubWallet;
  }

  public getMainTokenSubWallet(): AnySubWallet {
    return this.mainTokenSubWallet;
  }

  /**
   * Get the controller wallet that manages this AA wallet
   */
  public getControllerWalletId(): string {
    return this.masterWallet.getControllerWalletId();
  }

  public getControllerNetworkWallet(): Promise<AnyNetworkWallet> {
    const controllerWalletId = this.masterWallet.getControllerWalletId();
    return WalletService.instance.newNetworkWalletInstance(controllerWalletId, this.network);
  }

  public getAccountAbstractionProvider(): AccountAbstractionProvider {
    return AccountAbstractionProvidersService.instance.getProviderById(this.masterWallet.getAAProviderId());
  }

  public getAccountAbstractionAddress(): string {
    return this.safe.getAddresses(0, 1, false, AddressUsage.DEFAULT)[0];
  }
}
