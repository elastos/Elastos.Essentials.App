import { Config } from "src/app/wallet/config/Config";
import { StandardCoinName } from "../../../../../coin";
import { AnyEVMNetworkWallet } from "../../../../evms/networkwallets/evm.networkwallet";
import { ElastosEVMSubWallet } from "../../subwallets/standard/elastos.evm.subwallet";

export class EscSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: AnyEVMNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHSC, "Smart Chain");
  }

  public async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHSC_WITHDRAW_ADDRESS.toLowerCase();
  }

  public supportInternalTransactions() {
    return true;
  }
}