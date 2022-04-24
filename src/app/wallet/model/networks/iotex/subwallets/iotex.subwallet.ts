import { from } from "@iotexproject/iotex-address-ts";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";

export class IoTeXMainCoinSubwallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinEVMSubWallet<WalletNetworkOptionsType> {
  // For sending funds - must be a iotext address format, not EVM
  public isAddressValid(address: string): boolean {
    console.log("isAddressValid", address)

    let checkedAddress = from(address);

    console.log("isAddressValid 2", checkedAddress, checkedAddress.string())

    // The iotext library should be able to create an Address object of their own using the input address
    // and we should be able to rede it from string() (iotex format).
    return (checkedAddress && checkedAddress.string() === address);
  }
}