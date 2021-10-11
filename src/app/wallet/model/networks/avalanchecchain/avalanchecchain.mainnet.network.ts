import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";

export class AvalancheCChainMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "avalanchecchain",
      "Avalanche C-Chain",
      "assets/wallet/networks/avalance.png",
      "AVAX",
      "Avalanche Token",
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.RPC, MAINNET_TEMPLATE),
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      43114
    );
  }
}
