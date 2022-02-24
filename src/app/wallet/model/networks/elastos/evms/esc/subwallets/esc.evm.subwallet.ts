import { Config } from "src/app/wallet/config/Config";
import { StandardCoinName } from "../../../../../coin";
import { ElastosStandardNetworkWallet } from "../../../networkwallets/standard/elastos.networkwallet";
import { ElastosEVMSubWallet } from "../../subwallets/standard/elastos.evm.subwallet";

export class EscSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: ElastosStandardNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHSC, "Smart Chain");
  }

  public async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHSC_WITHDRAW_ADDRESS.toLowerCase();
  }
}