import { Logger } from "src/app/logger";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { StandardCoinName } from "../../../../coin";
import { AnyNetwork } from "../../../../networks/network";
import { ElastosIdentityTransactionProvider } from "../../../../tx-providers/elastos/elastos.identitychain.tx.provider";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardMasterWallet } from "../../../masterwallet";
import { WalletAddressInfo } from "../../../networkwallet";
import { EidSubWallet } from "../subwallets/eid.evm.subwallet";
import { ElastosEVMSubWallet } from "../subwallets/elastos.evm.subwallet";
import { ElastosStandardNetworkWallet } from "./elastos.networkwallet";

export class ElastosIdentityChainStandardNetworkWallet extends ElastosStandardNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: AnyNetwork) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosIdentityTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.ETHDID);
      this.subWallets[StandardCoinName.ETHDID] = new EidSubWallet(this);
      await this.subWallets[StandardCoinName.ETHDID].initialize();
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

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}