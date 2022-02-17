import { Logger } from "src/app/logger";
import { StandardCoinName } from "../../../coin";
import { Network } from "../../../networks/network";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { MasterWallet } from "../../masterwallet";
import { NetworkWallet, WalletAddressInfo } from "../../networkwallet";
import { EidSubWallet } from "../eid.evm.subwallet";
import { ElastosIdentityTransactionProvider } from "../providers/elastos.identitychain.tx.provider";

export class ElastosIdentityChainNetworkWallet extends NetworkWallet {
  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosIdentityTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHDID);
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

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return null;
  }

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  public getAverageBlocktime(): number {
    return 5;
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }
}