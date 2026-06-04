import Queue from 'promise-queue';
import { AccountAbstractionTransaction } from 'src/app/wallet/services/account-abstraction/model/account-abstraction-transaction';
import { UserOperation } from 'src/app/wallet/services/account-abstraction/model/user-operation';
import { LocalStorage } from 'src/app/wallet/services/storage.service';
import { AccountAbstractionNetworkWallet } from './networkwallets/account-abstraction.networkwallet';

export type AccountAbstractionProviderChainConfig = {
  chainId: number;
  entryPointAddress: string;
  bundlerRpcUrl: string;
  paymasterAddress: string;
  factoryAddress: string;
};

export abstract class AccountAbstractionProvider<
  ChainConfigType extends AccountAbstractionProviderChainConfig = AccountAbstractionProviderChainConfig
> {
  readonly id: string;
  readonly name: string;
  readonly supportedChains: ChainConfigType[];
  private queue = new Queue(1);

  constructor(id: string, name: string, supportedChains: ChainConfigType[]) {
    this.id = id;
    this.name = name;
    this.supportedChains = supportedChains;
  }

  /**
   * Returns the expected AA account address for a given EOA owner on a specific chain.
   * This works only for AA providers that support EOA ownership.
   *
   * This can either return a cached address, or compute/fetch it then save it.
   */
  protected abstract fetchAccountAddress(eoaAddress: string, chainId: number): Promise<string>;

  public getAccountAddress(eoaAddress: string, chainId: number): Promise<string> {
    return this.queue.add(async () => {
      // Try to load a cached address.
      const cachedAddress = await this.loadAccountAddress(eoaAddress, chainId);
      if (cachedAddress) {
        return cachedAddress;
      }

      // If no cached address, fetch it.
      const fetchedAddress = await this.fetchAccountAddress(eoaAddress, chainId);
      if (!fetchedAddress) {
        throw new Error(`Failed to fetch account address for EOA ${eoaAddress} on chain ${chainId}`);
      }

      await this.saveAccountAddress(eoaAddress, chainId, fetchedAddress);
      return fetchedAddress;
    });
  }

  /**
   * Saves an account address, normally retrieved from the contract, into local storage,
   * so we don't need to retrieve it again later.
   */
  protected async saveAccountAddress(eoaAddress: string, chainId: number, accountAddress: string): Promise<void> {
    await LocalStorage.instance.set(`aa-address-${this.id}-${eoaAddress}-${chainId}`, accountAddress);
  }

  protected loadAccountAddress(eoaAddress: string, chainId: number): Promise<string> {
    return LocalStorage.instance.get(`aa-address-${this.id}-${eoaAddress}-${chainId}`);
  }

  /**
   * Check if this provider supports a specific chain
   * @param chainId The chain ID
   * @returns True if supported
   */
  supportsChain(chainId: number): boolean {
    return this.supportedChains.some(chainConfig => chainConfig.chainId === chainId);
  }

  getSupportedChain(chainId: number): ChainConfigType {
    return this.supportedChains.find(chainConfig => chainConfig.chainId === chainId);
  }

  public abstract bundleAndSignTransaction(
    networkWallet: AccountAbstractionNetworkWallet,
    transaction: AccountAbstractionTransaction
  ): Promise<UserOperation>;

  public abstract publishTransaction(
    networkWallet: AccountAbstractionNetworkWallet,
    fullUserOp: UserOperation
  ): Promise<string>;

  /**
   * Signs a digest
   *
   * @param networkWallet The account abstraction network wallet
   * @param address The address to sign with (should be the EOA controller address)
   * @param digest The digest to sign (hex string)
   * @param password The password for the EOA wallet
   *
   * @returns Promise resolving to the signature
   */
  public abstract signDigest(
    networkWallet: AccountAbstractionNetworkWallet,
    address: string,
    digest: string,
    password: string
  ): Promise<string>;
}
