import { lazyEvmosImport } from "src/app/helpers/import.helper";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { WalletUtil } from "../../../wallet.util";
import { MainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";

export class EvmosMainCoinSubwallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinEVMSubWallet<WalletNetworkOptionsType> {
  public async isAddressValid(address: string): Promise<boolean> {
    try {
        let isEvmosAddress = false;
        if (address.startsWith('evmos')) {
            isEvmosAddress = true;
        }
        let addressTemp;
        if (isEvmosAddress) {
            const { evmosToEth } = await lazyEvmosImport();
            addressTemp = evmosToEth(address)
        } else {
            addressTemp = address;
        }
        return WalletUtil.isEVMAddress(addressTemp);
    } catch (e) {
    }
    return await false;
  }
}