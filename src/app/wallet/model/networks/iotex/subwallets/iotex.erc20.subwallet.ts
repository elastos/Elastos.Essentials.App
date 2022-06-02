import { from } from "@iotexproject/iotex-address-ts";
import { CoinID } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";

export class IoTeXERC20Subwallet extends ERC20SubWallet {
  constructor(public networkWallet: AnyNetworkWallet, id: CoinID) {
    super(networkWallet, id, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC), "IoTeX XRC20 Token");
  }

  // For sending funds - must be a iotex address format, not EVM
  public async isAddressValid(address: string): Promise<boolean> {
    let checkedAddress = from(address);
    // The iotex library should be able to create an Address object of their own using the input address
    // and we should be able to rede it from string() (iotex format).
    return await (checkedAddress && checkedAddress.string() === address);
  }
}