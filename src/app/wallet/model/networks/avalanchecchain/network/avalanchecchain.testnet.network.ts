import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AvalancheCChainBaseNetwork } from "./avalanchecchain.base.network";

export class AvalancheCChainTestNetNetwork extends AvalancheCChainBaseNetwork {
  constructor() {
    super(
      "avalanchecchain",
      "Avalanche FUJI C-Chain",
      "assets/wallet/networks/avalance.png",
      "AVAX",
      "Avalanche Token",
      TESTNET_TEMPLATE,
      43113,
    );

    this.averageBlocktime = 5 // 2;
  }
}
