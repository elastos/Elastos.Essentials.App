import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { WalletUtil } from "../../../wallet.util";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";

export class KavaMainCoinSubwallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinEVMSubWallet<WalletNetworkOptionsType> {
  public async isAddressValid(address: string): Promise<boolean> {
    try {
        let isKavaAddress = false;
        if (address.startsWith('kava')) {
            isKavaAddress = true;
        }
        let addressTemp;
        if (isKavaAddress) {
            let utils = (await import("@kava-labs/javascript-sdk")).utils;
            addressTemp = utils.kavaToEthAddress(address)
        } else {
            addressTemp = address;
        }
        return WalletUtil.isEVMAddress(addressTemp);
    } catch (e) {
    }
    return await false;
  }
}