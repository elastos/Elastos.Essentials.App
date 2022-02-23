import { StandardCoinName } from "../../../../coin";
import { LedgerMasterWallet } from "../../../../masterwallets/ledger.masterwallet";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../base/networkwallets/networkwallet";
import { AnyNetwork } from "../../../network";
import { ElastosEVMSubWallet } from "../../subwallets/elastos.evm.subwallet";
import { MainChainSubWallet } from "../../subwallets/mainchain.subwallet";
import { ElastosMainChainTransactionProvider } from "../../tx-providers/elastos.mainchain.tx.provider";
import { WalletHelper } from "../../wallet.helper";
import { ElastosLedgerNetworkWallet } from "./elastos.networkwallet";

export class ElastosMainChainLedgerNetworkWallet extends ElastosLedgerNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: AnyNetwork) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosMainChainTransactionProvider(this);
  }

  public getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = Promise.resolve([]);

    // TODO: get addresses from ledger

    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return null;
  }

  /**
   * Tells whether this wallet currently has many addresses in use or not.
   */
  public async multipleAddressesInUse(): Promise<boolean> {
    let mainChainSubWallet: MainChainSubWallet = this.subWallets[StandardCoinName.ELA] as MainChainSubWallet;
    let txListsInternal = await WalletHelper.getTransactionByAddress(mainChainSubWallet, true, 2);
    if (txListsInternal.length > 1) {
      return true;
    }
    let txListsExternal = await WalletHelper.getTransactionByAddress(mainChainSubWallet, false, 2);
    if (txListsExternal.length > 1) {
      return true;
    }

    return false;
  }

  public getAverageBlocktime(): number {
    return 120;
  }
}
