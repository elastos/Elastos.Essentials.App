import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { ElastosNetworkBase } from "./elastos.base.network";

export class ElastosTestNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("Elastos Testnet");

    // Remove it if block height > 807000
    // Use new protocol after 1032840.
    this.blockHeightForCrossChainV2 = 807000;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];
    availableCoins.push(new ERC20Coin("TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", 0, TESTNET_TEMPLATE, false));
    return availableCoins;
  }

  public getMainChainID(): number {
    return 21; // ETHSC is the main evm network for elastos
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
    onGoingConfig['ETHSC'] = { ChainID: 21, NetworkID: 21 };
    onGoingConfig['ETHDID'] = { ChainID: 23, NetworkID: 23 };
  }
}