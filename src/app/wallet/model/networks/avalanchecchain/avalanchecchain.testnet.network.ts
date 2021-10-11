import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EVMNetwork } from "../evm.network";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";

export class AvalancheCChainTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "avalanchecchain",
      "Avalanche FUJI C-Chain",
      "assets/wallet/networks/avalance.png",
      "AVAX",
      "Avalanche Token",
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.RPC, TESTNET_TEMPLATE),
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.ACCOUNT_RPC, TESTNET_TEMPLATE),
      TESTNET_TEMPLATE,
      43113
    );
  }
}
