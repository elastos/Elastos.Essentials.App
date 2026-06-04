import { BigNumber, ethers } from 'ethers';
import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { StandardCoinName } from '../../../../coin';
import { ProviderTransactionInfo } from '../../../../tx-providers/providertransactioninfo';
import { SubWalletTransactionProvider } from '../../../../tx-providers/subwallet.provider';
import { AnySubWallet } from '../../../base/subwallets/subwallet';
import { EVMNetwork } from '../../../evms/evm.network';
import { EthTransaction } from '../../../evms/evm.types';
import { Config } from '../../../../../config/Config';
import { ElastosEVMSubWallet } from '../subwallets/standard/elastos.evm.subwallet';
import { Util } from 'src/app/model/util';

// cross-chain event signature (obtained from analyzing transactions)
// event: CrossChain(address sender, bytes32 txId, address targetAddress, uint256 amount)
// txId: txId is the cross-chain transfer transaction ID on the Elastos main chain,
// but there is a key point: the byte order is reversed (little-endian to big-endian conversion is required).
const CROSS_CHAIN_TOPIC = '0x09f15c376272c265d7fcb47bf57d8f84a928195e6ea156d12f5a3cd05b8fed5a';

// zero address (cross-chain event comes from this address)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// batch size configuration
export const BATCH_SIZE = 50000;
export const TIMESTAMP_BATCH_SIZE = 10000;

/**
 * search progress information
 */
interface SearchProgress {
  // searched minimum block number (next search from this block backwards)
  searchedMinBlock: number;
  // latest block number when last searched
  lastKnownLatestBlock: number;
  // whether all historical search has been completed
  historicalSearchComplete: boolean;
}

interface CrossChainRecord {
  sender: string;        // sender address (address on mainchain or topics[1])
  txId: string;          // cross-chain transaction ID (topics[2])
  targetAddress: string; // target address (topics[3])
  amount: string;        // amount (topics[4])
  amountRaw: string;
  blockNumber: number;
  timestamp: number;
  timestampStr: string;
  transactionHash: string;
}

/**
 * convert topic to address format
 */
function topicToAddress(topic: string): string {
  return '0x' + topic.slice(26).toLowerCase();
}

/**
 * convert topic to BigNumber
 */
function topicToAmount(topic: string): any {
  return BigNumber.from(topic);
}

// ESC, EID, ECO
export class ElastosEvmRechargeTransactionProvider extends SubWalletTransactionProvider<ElastosEVMSubWallet, EthTransaction> {
  private canFetchMore = true;
  private isSearching = false; // prevent duplicate search
  private isBackgroundSearching = false; // prevent duplicate background search
  private searchProgress: SearchProgress = null;

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey:
        this.subWallet.masterWallet.id +
        '-' +
        this.subWallet.networkWallet.network.key +
        '-' +
        this.subWallet.id +
        '-rechargetransactions',
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: this.subWallet.id
    };
  }

  /**
   * get search progress storage key
   */
  private getProgressStorageKey(): string {
    return `recharge-search-progress-${this.subWallet.masterWallet.id}-${this.subWallet.networkWallet.network.key}-${this.subWallet.id}`;
  }

  /**
   * load search progress
   */
  private async loadSearchProgress(): Promise<SearchProgress> {
    if (this.searchProgress) {
      return this.searchProgress;
    }

    const key = this.getProgressStorageKey();
    const progress = await GlobalStorageService.instance.getSetting<SearchProgress>(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      key,
      null,
      'browserlocalstorage'
    );

    this.searchProgress = progress || {
      searchedMinBlock: 0,
      lastKnownLatestBlock: 0,
      historicalSearchComplete: false
    };

    return this.searchProgress;
  }

  /**
   * save search progress
   */
  private async saveSearchProgress(): Promise<void> {
    if (!this.searchProgress) return;
    const key = this.getProgressStorageKey();
    await GlobalStorageService.instance.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      key,
      this.searchProgress,
      'browserlocalstorage'
    );
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.canFetchMore;
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    // prevent duplicate search
    if (this.isSearching) {
      Logger.log('wallet', 'Recharge transaction search already in progress, skipping...');
      return;
    }

    this.isSearching = true;

    try {
      const accountAddress = this.subWallet.getCurrentReceiverAddress();
      const provider = (this.subWallet.networkWallet.network as EVMNetwork).getJsonRpcProvider();

      // get current latest block
      const currentBlock = await provider.getBlockNumber();
      Logger.log('wallet', `Current block: ${currentBlock}`);

      // load search progress
      const progress = await this.loadSearchProgress();
      Logger.log('wallet', 'Loaded search progress:', progress);

      // 1. first search new blocks (from last known latest block to current latest block)
      if (progress.lastKnownLatestBlock > 0 && progress.lastKnownLatestBlock < currentBlock) {
        Logger.log('wallet', `Searching new blocks: ${progress.lastKnownLatestBlock + 1} to ${currentBlock}`);
        await this.searchBlockRange(
          progress.lastKnownLatestBlock + 1,
          currentBlock,
          accountAddress,
          provider
        );
      }

      // update latest block number
      progress.lastKnownLatestBlock = currentBlock;
      await this.saveSearchProgress();

      // 2. if historical search is not completed and not already running, continue background search
      if (!progress.historicalSearchComplete && !this.isBackgroundSearching) {
        // determine search start point
        const searchFromBlock = progress.searchedMinBlock > 0 ? progress.searchedMinBlock - 1 : currentBlock;

        if (searchFromBlock > 1) {
          // start background search (not blocking UI)
          this.backgroundHistoricalSearch(searchFromBlock, accountAddress, provider);
        } else {
          progress.historicalSearchComplete = true;
          this.canFetchMore = false;
          await this.saveSearchProgress();
        }
      } else if (progress.historicalSearchComplete) {
        this.canFetchMore = false;
      }
      // else: background search is already running, do nothing
    } catch (e) {
      Logger.error('wallet', 'ElastosEvmRechargeTransactionProvider fetchTransactions error:', e);
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * search specified block range, find transaction immediately save and notify UI
   */
  private async searchBlockRange(
    fromBlock: number,
    toBlock: number,
    accountAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<void> {
    const topics = this.buildTopics(null, accountAddress);

    for (let endBlock = toBlock; endBlock >= fromBlock; endBlock -= BATCH_SIZE) {
      const startBlock = Math.max(endBlock - BATCH_SIZE + 1, fromBlock);

      try {
        const logs = await provider.getLogs({
          address: ZERO_ADDRESS,
          topics: topics,
          fromBlock: startBlock,
          toBlock: endBlock
        });

        if (logs.length > 0) {
          Logger.warn('wallet', `Found ${logs.length} recharge transactions in blocks ${startBlock}-${endBlock} from ${accountAddress} on sidechain ${this.subWallet.networkWallet.network.key}`);

          // get block timestamps
          const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
          const blockTimestamps = await this.getBlockTimestamps(blockNumbers);

          // parse and immediately save transactions
          const records = await this.parseLogsToRecords(logs, blockTimestamps);
          const transactions = this.convertToEthTransaction(records);

          // save transactions - this will automatically notify UI update
          await this.saveTransactions(transactions);
        }
      } catch (error) {
        Logger.warn('wallet', `Failed to search blocks ${startBlock}-${endBlock}:`, error);
        // use smaller batch to retry
        await this.searchBlockRangeSmallBatch(startBlock, endBlock, accountAddress, provider);
      }
    }
  }

  /**
   * use smaller batch to search block range
   */
  private async searchBlockRangeSmallBatch(
    fromBlock: number,
    toBlock: number,
    accountAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<void> {
    const SMALLER_BATCH = 10000;
    const topics = this.buildTopics(null, accountAddress);

    for (let endBlock = toBlock; endBlock >= fromBlock; endBlock -= SMALLER_BATCH) {
      const startBlock = Math.max(endBlock - SMALLER_BATCH + 1, fromBlock);

      try {
        const logs = await provider.getLogs({
          address: ZERO_ADDRESS,
          topics: topics,
          fromBlock: startBlock,
          toBlock: endBlock
        });

        if (logs.length > 0) {
          const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
          const blockTimestamps = await this.getBlockTimestamps(blockNumbers);
          const records = await this.parseLogsToRecords(logs, blockTimestamps);
          const transactions = this.convertToEthTransaction(records);
          await this.saveTransactions(transactions);
        }
      } catch (error) {
        Logger.error('wallet', `Failed to search blocks ${startBlock}-${endBlock} with small batch:`, error);
      }
    }
  }

  /**
   * background historical search - asynchronous execution, not blocking main process
   */
  private backgroundHistoricalSearch(
    startFromBlock: number,
    accountAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ): void {
    // use setTimeout to ensure not blocking current execution
    setTimeout(() => {
      void this.executeBackgroundSearch(startFromBlock, accountAddress, provider);
    }, 0);
  }

  /**
   * execute background historical search actual logic
   */
  private async executeBackgroundSearch(
    startFromBlock: number,
    accountAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<void> {
    // prevent duplicate background search
    if (this.isBackgroundSearching) {
      Logger.log('wallet', 'Background search already in progress, skipping...');
      return;
    }

    this.isBackgroundSearching = true;
    Logger.log('wallet', `Starting background search from block ${startFromBlock}`);

    try {
      const progress = await this.loadSearchProgress();
      const topics = this.buildTopics(null, accountAddress);

      for (let toBlock = startFromBlock; toBlock >= 1; toBlock -= BATCH_SIZE) {
        const fromBlock = Math.max(toBlock - BATCH_SIZE + 1, 1);

        try {
          const logs = await provider.getLogs({
            address: ZERO_ADDRESS,
            topics: topics,
            fromBlock,
            toBlock
          });

          if (logs.length > 0) {
            Logger.log('wallet', `[Background] Found ${logs.length} recharge transactions in blocks ${fromBlock}-${toBlock}`);

            const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
            const blockTimestamps = await this.getBlockTimestamps(blockNumbers);
            const records = await this.parseLogsToRecords(logs, blockTimestamps);
            const transactions = this.convertToEthTransaction(records);

            // save transactions - this will automatically notify UI update
            await this.saveTransactions(transactions);
          }

          // update search progress
          progress.searchedMinBlock = fromBlock;
          await this.saveSearchProgress();

        } catch (error) {
          Logger.warn('wallet', `[Background] Failed to search blocks ${fromBlock}-${toBlock}:`, error);
          // use smaller batch to retry
          await this.searchBlockRangeSmallBatch(fromBlock, toBlock, accountAddress, provider);
          progress.searchedMinBlock = fromBlock;
          await this.saveSearchProgress();
        }

        // add small delay to avoid overusing resources
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // historical search completed
      progress.historicalSearchComplete = true;
      this.canFetchMore = false;
      await this.saveSearchProgress();
      Logger.log('wallet', 'Historical recharge transaction search completed');

    } catch (error) {
      Logger.error('wallet', 'Background historical search error:', error);
    } finally {
      this.isBackgroundSearching = false;
    }
  }

  private convertToEthTransaction(records: CrossChainRecord[]): EthTransaction[] {
    return records.map((record) => {
      return {
        // basic transaction information
        hash: record.transactionHash,
        blockNumber: record.blockNumber.toString(),
        blockHash: '', // cross-chain event log not provided, leave empty
        timeStamp: record.timestamp.toString(),

        // address information: cross-chain recharge from zero address to target address
        from: record.sender,
        to: record.targetAddress,
        contractAddress: ZERO_ADDRESS,

        // amount information (using original wei value)
        value: record.amountRaw,

        // gas related (cross-chain recharge event does not consume user gas, set to 0)
        gas: '0',
        gasPrice: '0',
        gasUsed: '0',
        cumulativeGasUsed: '0',

        // tx status
        confirmations: '',
        isError: '0',
        txreceipt_status: '1',

        input: '0x',
        nonce: '0',
        transactionIndex: '0',

        isCrossChain: true,
      } as EthTransaction;
    });
  }

  /**
   * build topics filter array
   */
  private buildTopics(filterFromAddress?: string, filterToAddress?: string): (string | null)[] {
    const topics: (string | null)[] = [CROSS_CHAIN_TOPIC];

    if (filterFromAddress) {
      topics.push('0x000000000000000000000000' + filterFromAddress.slice(2).toLowerCase());
    } else {
      topics.push(null);
    }

    topics.push(null); // txId not filtered

    if (filterToAddress) {
      topics.push('0x000000000000000000000000' + filterToAddress.slice(2).toLowerCase());
    }

    return topics;
  }

  /**
   * get block timestamps
   */
  private async getBlockTimestamps(blockNumbers: number[]): Promise<Map<number, number>> {
    const blockTimestamps: Map<number, number> = new Map();

    for (let i = 0; i < blockNumbers.length; i += TIMESTAMP_BATCH_SIZE) {
      const batch = blockNumbers.slice(i, i + TIMESTAMP_BATCH_SIZE);

      try {
        const batchRequest = batch.map((blockNum: number, idx: number) => ({
          jsonrpc: '2.0',
          id: idx,
          method: 'eth_getBlockByNumber',
          params: ['0x' + blockNum.toString(16), false]
        }));


        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(this.subWallet.id);
        const rpcApiUrl = GlobalElastosAPIService.instance.getRPCApiUrlWithOverride(apiurltype);
        const results = await GlobalJsonRPCService.instance.httpPost(rpcApiUrl, batchRequest);

        for (const result of results) {
          if (result.result && result.result.timestamp) {
            const blockNum = parseInt(result.result.number, 16);
            const timestamp = parseInt(result.result.timestamp, 16);
            blockTimestamps.set(blockNum, timestamp);
          }
        }
      } catch (error) {
        Logger.error('wallet', 'get block timestamps failed:', error);
      }
    }

    return blockTimestamps;
  }

  /**
   * parse logs to records
   */
  private async parseLogsToRecords(logs: any[], blockTimestamps: Map<number, number>): Promise<CrossChainRecord[]> {
    // First, collect all txIds and get mainchain transaction details in batch
    const mainchainTxIds: string[] = [];
    for (const log of logs) {
      const txId = log.topics[2];
      const mainchainTxId = Util.reversetxid(txId);
      mainchainTxIds.push(mainchainTxId);
    }

    // Get sender addresses from mainchain transactions
    const senderAddresses = await this.getMainchainSenderAddresses(mainchainTxIds);

    return logs.map((log: any, index: number) => {
      const timestamp = blockTimestamps.get(log.blockNumber) || 0;
      const timestampStr = timestamp ? new Date(timestamp * 1000).toISOString() : '';

      // Use mainchain sender address if available, otherwise fallback to topics[1]
      const mainchainSender = senderAddresses.get(mainchainTxIds[index]);
      const sender = mainchainSender || topicToAddress(log.topics[1]);
      const txId = log.topics[2];
      const targetAddress = topicToAddress(log.topics[3]);
      const amountBN = topicToAmount(log.topics[4]);

      return {
        sender,
        txId,
        targetAddress,
        amount: (ethers as any).utils.formatEther(amountBN),
        amountRaw: amountBN.toString(),
        blockNumber: log.blockNumber,
        timestamp,
        timestampStr,
        transactionHash: log.transactionHash
      };
    });
  }

  /**
   * Get the deposit address for the current sidechain
   */
  private getDepositAddress(): string {
    const subWalletId = this.subWallet.id;
    switch (subWalletId) {
      case StandardCoinName.ETHSC:
        return Config.ETHSC_DEPOSIT_ADDRESS;
      case StandardCoinName.ETHDID:
        return Config.ETHDID_DEPOSIT_ADDRESS;
      case StandardCoinName.ETHECO:
        return Config.ETHECO_DEPOSIT_ADDRESS;
      case StandardCoinName.ETHECOPGP:
        return Config.ETHECOPGP_DEPOSIT_ADDRESS;
      default:
        return Config.ETHSC_DEPOSIT_ADDRESS;
    }
  }

  /**
   * Get sender addresses from mainchain transactions in batch
   * Finds the address in vout that is not the deposit address (cross-chain lock address)
   */
  private async getMainchainSenderAddresses(txIds: string[]): Promise<Map<string, string>> {
    const senderMap = new Map<string, string>();

    if (txIds.length === 0) {
      return senderMap;
    }

    try {
      // Build batch request for mainchain RPC
      const batchRequest = txIds.map((txid: string, idx: number) => ({
        jsonrpc: '2.0',
        id: idx,
        method: 'getrawtransaction',
        params: {
          txid: txid,
          verbose: true
        }
      }));

      const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(StandardCoinName.ELA);
      if (!rpcApiUrl) {
        Logger.warn('wallet', 'Mainchain RPC URL not available');
        return senderMap;
      }

      const results = await GlobalJsonRPCService.instance.httpPost(rpcApiUrl, batchRequest);

      // Get the deposit address for current sidechain
      const depositAddress = this.getDepositAddress();

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.result && result.result.vout && result.result.vout.length > 0) {
          // Find the address in vout that is NOT the deposit address
          // This should be the sender's address (change output or sender's original address)
          for (const vout of result.result.vout) {
            const address = vout.address;
            if (address && address !== depositAddress) {
              senderMap.set(txIds[i], address);
              break;
            }
          }
        }
        // TODO: handle the case where the sender is not found in result.result.vout
      }
    } catch (error) {
      Logger.warn('wallet', 'Failed to get mainchain sender addresses:', error);
    }

    return senderMap;
  }
}
