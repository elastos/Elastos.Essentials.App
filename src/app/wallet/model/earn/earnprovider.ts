import { BaseEarnSwapProvider } from "./baseearnswapprovider";

type CompoundCoinInfo = {
  cContract: string; // Ex: fUSDT contract address -
  underlyingERC20Contract?: string; // Ex: USDT contract address - No underlying contract means main token. Matches with ERC20 contracts
}

export class EarnProvider {
  constructor(
    public baseProvider: BaseEarnSwapProvider,
    public compoundCoins: CompoundCoinInfo[], // List of coins that can be staked using the compound protocol
    public additionalCoins?: string[], // List of ERC20 coins contracts that can earn, but not as compound
    public depositUrl?: string // Specific target url to deposit a specific coin
  ) {
    // Make sure all providers use lowercase contract addresses
    this.fixContractAddresses();
  }

  private fixContractAddresses() {
    this.compoundCoins.forEach(cc => {
      cc.cContract = cc.cContract.toLowerCase();
      if (cc.underlyingERC20Contract)
        cc.underlyingERC20Contract = cc.underlyingERC20Contract.toLowerCase();
    });
  }
}