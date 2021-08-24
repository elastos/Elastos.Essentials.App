import { ERC20Coin } from "../coin";

export abstract class Network {
  // key: string; // unique identifier
  // name: string; // Human readable network name - Elastos, HECO
  // logo: string; // Path to the network icon
  constructor(public key: string, public name: string, public logo: string) {}

  /**
   * Returns a list of available ERC20 coins that we trust for this network, and that user will be able to 
   * display on this wallet or not.
   */
  public abstract getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[];
}