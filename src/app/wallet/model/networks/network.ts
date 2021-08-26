import { SPVNetworkConfig } from "../../services/wallet.service";
import { CoinID, ERC20Coin } from "../Coin";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";

export abstract class Network {
  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string // Path to the network icon
  ) {}

  /**
   * Returns a list of available ERC20 coins that we trust for this network, and that user will be able to
   * display on this wallet or not.
   */
  public abstract getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[];

  /**
   * Creates a network wallet for the given master wallet.
   */
  public abstract createNetworkWallet(masterWallet: MasterWallet): NetworkWallet;

  /**
   * Creates the right ERC20 sub wallet instance for this network.
   */
  public abstract createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID): ERC20SubWallet;

  public abstract getMainEvmRpcApiUrl(): string;

  public abstract getMainTokenSymbol(): string;

  /**
   * Returns the EVM chain ID for this network (i.e. 128 for heco) according to the active network template.
   * For elastos, as there are multiple EVM chains, the ETHSC is the "main" one.
   */
  public abstract getMainChainID(networkTemplate?: string): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string);
}