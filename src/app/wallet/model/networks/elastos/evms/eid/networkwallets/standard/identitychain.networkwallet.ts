import { Logger } from "src/app/logger";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { WalletAddressInfo } from "src/app/wallet/model/networks/base/networkwallets/networkwallet";
import { AnyNetwork } from "src/app/wallet/model/networks/network";
import { SPVSDKSafe } from "src/app/wallet/model/safes/spvsdk.safe";
import { TransactionProvider } from "src/app/wallet/model/tx-providers/transaction.provider";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { ElastosStandardNetworkWallet } from "../../../../networkwallets/standard/elastos.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { EidSubWallet } from "../../subwallets/standard/eid.evm.subwallet";
import { ElastosIdentityTransactionProvider } from "../../tx-providers/elastos.eid.tx.provider";

export class ElastosIdentityChainStandardNetworkWallet extends ElastosStandardNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: AnyNetwork) {
    super(
      masterWallet,
      network,
      new SPVSDKSafe(masterWallet, StandardCoinName.ETHDID),
      "ELA"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosIdentityTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.ETHDID);
      this.subWallets[StandardCoinName.ETHDID] = new EidSubWallet(this);
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos EID subwallet", err);
    }
  }

  public async getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = [];

    // No ETHDID in LRW.
    if (this.subWallets[StandardCoinName.ETHDID]) {
      addresses.push({
        title: this.subWallets[StandardCoinName.ETHDID].getFriendlyName(),
        address: await this.subWallets[StandardCoinName.ETHDID].createAddress()
      });
    }

    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return null;
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}