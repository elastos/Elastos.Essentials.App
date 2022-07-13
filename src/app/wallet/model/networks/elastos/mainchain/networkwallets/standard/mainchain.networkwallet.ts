import { Logger } from "src/app/logger";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../../../coin";
import { StandardMasterWallet } from "../../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../base/networkwallets/networkwallet";
import { AnyNetwork } from "../../../../network";
import { ElastosEVMSubWallet } from "../../../evms/subwallets/standard/elastos.evm.subwallet";
import { ElastosStandardNetworkWallet } from "../../../networkwallets/standard/elastos.networkwallet";
import { WalletHelper } from "../../../wallet.helper";
import { MainChainSPVSDKSafe } from "../../safes/mainchain.spvsdk.safe";
import { MainChainSubWallet } from "../../subwallets/mainchain.subwallet";
import { ElastosMainChainTransactionProvider } from "../../tx-providers/elastos.mainchain.tx.provider";

export class ElastosMainChainStandardNetworkWallet extends ElastosStandardNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: AnyNetwork) {
    super(
      masterWallet,
      network,
      new MainChainSPVSDKSafe(masterWallet, StandardCoinName.ELA),
      "ELA"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosMainChainTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.ELA);
      this.subWallets[StandardCoinName.ELA] = new MainChainSubWallet(this);
      await this.subWallets[StandardCoinName.ELA].initialize();
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos main chain standard subwallets ", err);
      throw err;
    }
  }

  public async getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = [];

    // No ELA when imported by private key.
    if (this.subWallets[StandardCoinName.ELA]) {
      addresses.push({
        title: this.subWallets[StandardCoinName.ELA].getFriendlyName(),
        address: await this.subWallets[StandardCoinName.ELA].getCurrentReceiverAddress()
      });
    }

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
