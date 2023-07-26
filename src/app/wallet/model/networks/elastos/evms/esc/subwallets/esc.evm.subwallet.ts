import { Config } from "src/app/wallet/config/Config";
import { MintBPoSNFTTxInfo, MintBPoSNFTTxStatus } from "src/app/wallet/model/elastos.types";
import { TimeBasedPersistentCache } from "src/app/wallet/model/timebasedpersistentcache";
import { BPoSERC721Service } from "src/app/wallet/services/evm/bpos.erc721.service";
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

  public async getClaimableTxs() {
    await this.updateNFTTxStatus();
    return this.mintNFTTxCache.values()
        .filter( t => t.data.status == MintBPoSNFTTxStatus.Claimable)
        .map(t => {return t.data});
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

  private async updateNFTTxStatus() {
    let txList = this.getUnClaimedTxs();
    for (let i = 0; i < txList.length; i++) {
      let ret = await BPoSERC721Service.instance.canClaim(txList[i].txid);
      if (null == ret) {
        // Do nothing
      } else if ('0' == ret) {
        txList[i].status = MintBPoSNFTTxStatus.Claimed;
        this.updateMintNFTTx(txList[i]);
      } else {
        txList[i].status = MintBPoSNFTTxStatus.Claimable;
        this.updateMintNFTTx(txList[i]);
      }
    }
  }
}