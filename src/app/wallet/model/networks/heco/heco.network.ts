import { ERC20Coin } from "../../coin";
import { Network } from "../network";

export class HECONetwork extends Network {
  constructor() {
    super("heco", "HECO", "assets/wallet/networks/hecochain.png");
  }

  public getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[] {
    return [];
  }
}