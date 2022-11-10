import { lazyKavaImport } from "src/app/helpers/import.helper";
import { CoinID } from "../../../coin";
import { WalletUtil } from "../../../wallet.util";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";

export class KavaERC20Subwallet extends ERC20SubWallet {
  constructor(public networkWallet: AnyNetworkWallet, id: CoinID) {
    super(networkWallet, id, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC), "IoTeX XRC20 Token");
  }

  public async isAddressValid(address: string): Promise<boolean> {
    try {
        let isKavaAddress = false;
        if (address.startsWith('kava')) {
            isKavaAddress = true;
        }
        let addressTemp;
        if (isKavaAddress) {
            const { utils } = await lazyKavaImport();
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