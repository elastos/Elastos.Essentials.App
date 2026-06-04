import { AccountAbstractionProvidersService } from '../../services/account-abstraction/account-abstraction-providers.service';
import { WalletJSSDKHelper } from '../networks/elastos/wallet.jssdk.helper';
import { EVMNetwork } from '../networks/evms/evm.network';
import { AnyNetwork } from '../networks/network';
import { MasterWallet } from './masterwallet';
import { SerializedAccountAbstractionMasterWallet } from './wallet.types';

/**
 * One AA master wallet can work only on ONE chain (network wallet).
 */
export class AccountAbstractionMasterWallet extends MasterWallet {
  public controllerWalletId: string;
  public aaProviderId: string;

  public static newFromSerializedWallet(
    serialized: SerializedAccountAbstractionMasterWallet
  ): AccountAbstractionMasterWallet {
    let masterWallet = new AccountAbstractionMasterWallet();

    // Base type deserialization
    masterWallet.deserialize(serialized);

    return masterWallet;
  }

  public async destroy() {
    // Destroy the wallet in the wallet js sdk if it exists
    try {
      await WalletJSSDKHelper.destroyWallet(this.id);
    } catch (e) {
      // Wallet might not exist in JS SDK, ignore error
    }
  }

  protected deserialize(serialized: SerializedAccountAbstractionMasterWallet) {
    super.deserialize(serialized);

    this.controllerWalletId = serialized.controllerMasterWalletId;
    this.aaProviderId = serialized.aaProviderId;
  }

  public serialize(): SerializedAccountAbstractionMasterWallet {
    let serialized: SerializedAccountAbstractionMasterWallet = {} as SerializedAccountAbstractionMasterWallet;

    super._serialize(serialized as SerializedAccountAbstractionMasterWallet);

    serialized.controllerMasterWalletId = this.controllerWalletId;
    serialized.aaProviderId = this.aaProviderId;

    return serialized;
  }

  public hasMnemonicSupport(): boolean {
    return false; // AA wallets don't have mnemonics, they're controlled by other wallets
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    // AA wallets are only supported on EVM networks
    if (!network.isEVMNetwork()) {
      return false;
    }

    const evmNetwork = network as EVMNetwork;
    const chainId = evmNetwork.getMainChainID();

    // Check if the AA provider used by this wallet supports the given chain
    const provider = AccountAbstractionProvidersService.instance.getProviderById(this.aaProviderId);
    if (!provider) {
      return false;
    }

    return provider.supportsChain(chainId);
  }

  /**
   * Get the AA provider ID used by this wallet
   */
  public getAAProviderId(): string {
    return this.aaProviderId;
  }

  /**
   * Get the controller wallet that manages this AA wallet
   */
  public getControllerWalletId(): string {
    return this.controllerWalletId;
  }
}
