import { Config } from "src/app/wallet/config/Config";
import { AnyEVMNetworkWallet } from "src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet";
import { StandardCoinName } from "../../../../../../coin";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";

export class EidSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: AnyEVMNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHDID, "Identity Chain");
  }

  public async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
    this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
  }
}