import { BaseEarnSwapProvider } from "./baseearnswapprovider";

export class BridgeProvider {
  constructor(
    public baseProvider: BaseEarnSwapProvider,
    public canBridgeNativeToken: boolean, // Whether this provider can bridge from/to the native token of the network he belongs to (Ex: ELA on Elastos network)
    public bridgeableTokenContracts: string[], // List of coins that can be bridged (contract addresses)
    public bridgeUrl?: string // Specific target url to bridge a specific coin
  ) {
    // Make sure all providers use lowercase contract addresses
    this.fixContractAddresses();
  }

  private fixContractAddresses() {
    this.bridgeableTokenContracts = this.bridgeableTokenContracts.map(c => c.toLowerCase());
  }
}