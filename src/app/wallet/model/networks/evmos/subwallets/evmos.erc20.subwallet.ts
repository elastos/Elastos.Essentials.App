import { lazyEvmosImport } from "src/app/helpers/import.helper";
import { CoinID } from "../../../coin";
import { WalletUtil } from "../../../wallet.util";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";

export class EvmosERC20Subwallet extends ERC20SubWallet {
  constructor(public networkWallet: AnyNetworkWallet, id: CoinID) {
    super(networkWallet, id, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC), "IoTeX XRC20 Token");
  }

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