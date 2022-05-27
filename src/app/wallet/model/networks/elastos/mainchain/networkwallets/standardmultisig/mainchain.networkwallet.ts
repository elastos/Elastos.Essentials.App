import { Logger } from "src/app/logger";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../base/networkwallets/networkwallet";
import { StandardMultiSigNetworkWallet } from "../../../../base/networkwallets/standard.multisig.networkwallet";
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { AnyNetwork } from "../../../../network";
import { ElastosEVMSubWallet } from "../../../evms/subwallets/standard/elastos.evm.subwallet";
import { MainChainMultiSigSafe } from "../../safes/multisig/mainchain.multisig.safe";
import { MainChainSubWallet } from "../../subwallets/mainchain.subwallet";
import { ElastosMainChainTransactionProvider } from "../../tx-providers/elastos.mainchain.tx.provider";

export class ElastosMainChainStandardMultiSigNetworkWallet extends StandardMultiSigNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  constructor(masterWallet: StandardMultiSigMasterWallet, network: AnyNetwork) {
    super(
      masterWallet,
      network,
      new MainChainMultiSigSafe(masterWallet),
      "ELA"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosMainChainTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      this.subWallets[StandardCoinName.ELA] = new MainChainSubWallet(this);
      await this.subWallets[StandardCoinName.ELA].initialize();
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos main chain multi-sig subwallets ", err);
    }
  }

  public async getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = [];

    /*  // No ELA when imported by private key.
     if (this.subWallets[StandardCoinName.ELA]) {
       addresses.push({
         title: this.subWallets[StandardCoinName.ELA].getFriendlyName(),
         address: await this.subWallets[StandardCoinName.ELA].getCurrentReceiverAddress()
       });
     } */

    return await addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return null;
  }

  public getMultiSigSubWallet(): AnySubWallet {
    return this.subWallets[StandardCoinName.ELA];
  }

  /**
   * Tells whether this wallet currently has many addresses in use or not.
   */
  public async multipleAddressesInUse(): Promise<boolean> {
    /* let mainChainSubWallet: MainChainSubWallet = this.subWallets[StandardCoinName.ELA] as MainChainSubWallet;
    let txListsInternal = await WalletHelper.getTransactionByAddress(mainChainSubWallet, true, 2);
    if (txListsInternal.length > 1) {
      return true;
    }
    let txListsExternal = await WalletHelper.getTransactionByAddress(mainChainSubWallet, false, 2);
    if (txListsExternal.length > 1) {
      return true;
    }

    return false; */
    return await false; // TODO
  }

  public getAverageBlocktime(): number {
    return 120;
  }
}
