import { BaseEarnSwapProvider } from "./baseearnswapprovider";

export class SwapProvider {
  constructor(
    public baseProvider: BaseEarnSwapProvider,
    public swappableTokenContracts: string[], // List of coins that can be swapped (contract addresses)
    public swapUrl?: string // Specific target url to swap a specific coin
  ) {
    // Make sure all providers use lowercase contract addresses
    this.fixContractAddresses();
  }

  private fixContractAddresses() {
    this.swappableTokenContracts = this.swappableTokenContracts.map(c => c.toLowerCase());
  }
}