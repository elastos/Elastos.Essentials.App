import { from } from "@iotexproject/iotex-address-ts";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";

export class IoTeXMainCoinSubwallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinEVMSubWallet<WalletNetworkOptionsType> {
  // For sending funds - must be a iotex address format, not EVM
  public async isAddressValid(address: string): Promise<boolean> {
    try {
      // The iotex library should be able to create an Address object of their own using the input address
      // and we should be able to rede it from string() (iotex format).
      let checkedAddress = from(address);
      if (checkedAddress)
        return await true;
    } catch (e) {
    }
    return await false;
  }
}