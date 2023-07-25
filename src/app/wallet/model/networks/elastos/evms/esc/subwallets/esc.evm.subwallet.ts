import { Config } from "src/app/wallet/config/Config";
import { MintBPoSNFTTxInfo, MintBPoSNFTTxStatus } from "src/app/wallet/model/elastos.types";
import { TimeBasedPersistentCache } from "src/app/wallet/model/timebasedpersistentcache";
import { StandardCoinName } from "../../../../../coin";
import { AnyEVMNetworkWallet } from "../../../../evms/networkwallets/evm.networkwallet";
import { ElastosEVMSubWallet } from "../../subwallets/standard/elastos.evm.subwallet";

export class EscSubWallet extends ElastosEVMSubWallet {
  private mintNFTTxCache: TimeBasedPersistentCache<any> = null;
  private mintNFTTxKeyInCache = null;

  constructor(networkWallet: AnyEVMNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHSC, "Smart Chain");
  }

  public async initialize() {
    await super.initialize();

    await this.loadMintNFTTxFromCache();

    this.withdrawContractAddress = Config.ETHSC_WITHDRAW_ADDRESS.toLowerCase();
  }

  public supportInternalTransactions() {
    return true;
  }

  // Unconfirmed + Claimable
  public getUnClaimedTxs() {
    return this.mintNFTTxCache.values()
              .filter( t => t.data.status !== MintBPoSNFTTxStatus.Claimed)
              .map(t => {return t.data});
  }

  public async updateMintNFTTx(data: MintBPoSNFTTxInfo) {
    if (this.mintNFTTxCache.get(data.txid)) {
      this.saveMintNFTTxToCache(data)
    }
  }

  private async loadMintNFTTxFromCache() {
      if (!this.mintNFTTxCache) {
        this.mintNFTTxKeyInCache = this.masterWallet.id + '-mintbposnft';
      }
      this.mintNFTTxCache = await TimeBasedPersistentCache.loadOrCreate(this.mintNFTTxKeyInCache);
  }

  public async saveMintNFTTxToCache(data: MintBPoSNFTTxInfo): Promise<void> {
      const timestamp = (new Date()).valueOf();
      this.mintNFTTxCache.set(data.txid, data, timestamp);
      await this.mintNFTTxCache.save();
  }
}