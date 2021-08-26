import { Config } from "src/app/wallet/config/Config";
import { StandardCoinName } from "../../Coin";
import { NetworkWallet } from "../networkwallet";
import { ElastosEVMSubWallet } from "./elastos.evm.subwallet";

export class EidSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHDID);
  }

  protected async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
    this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
  }
}