import { Injectable } from '@angular/core';
import { BigNumber } from 'bignumber.js';
import { Buffer } from 'buffer';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { environment } from 'src/environments/environment';
import { PollDetails } from '../model/poll-details.model';
import { Poll } from '../model/poll.model';
import { StoredVoteInfo } from '../model/stored-vote-info.model';
import { Vote } from '../model/vote.model';
import { LocalStorage } from './storage.service';

/**
 * If true, fetches polls with specific type 255 which are only internal polls.
 */
const USE_TEST_POLLS = environment.useTestPolls;

@Injectable({
  providedIn: 'root'
})
export class MainchainPollsService {
  // private apiBaseUrl = 'https://ela-node-test.eadd.co/'; // For testing
  private apiBaseUrl = 'https://api.elastos.io/ela';

  private readonly USER_VOTE_FLAG = 'pollvote';
  private readonly USER_VOTE_FLAG_BYTE_LENGTH = 8; // 8 bytes
  public static readonly PENDING_VOTE_TIMEOUT_SEC = 30 * 60; // 30 minutes in seconds

  // Caching
  private pollIdsCache: string[] | null = null;
  private pollInfoCache: Map<string, Poll> = new Map();
  private pollDetailsCache: Map<string, PollDetails> = new Map();

  constructor(
    private globalJsonRPCService: GlobalJsonRPCService,
    private walletNetworkService: WalletNetworkService,
    private walletService: WalletService,
    private localStorage: LocalStorage
  ) {}

  /**
   * Calculates the vote amount from available balance (balance - 1 ELA for fees)
   * @param balance - Available balance in sELA (smallest unit)
   * @returns Vote amount in sELA (smallest unit), or null if insufficient balance
   */
  calculateVoteAmount(balance: BigNumber): BigNumber | null {
    if (!balance || balance.isLessThanOrEqualTo(0)) {
      return null;
    }

    const oneELA = new BigNumber(1).multipliedBy(Config.SELAAsBigNumber);
    const voteAmount = balance.minus(oneELA);

    if (voteAmount.isLessThanOrEqualTo(0)) {
      return null;
    }

    return voteAmount;
  }

  /**
   * Encodes vote data into binary memo format for Elastos mainchain transactions
   *
   * @param userVoteFlag - Fixed-length string matching InitiateVoting Flag
   * @param pollId - uint256 hash of voting information (32 bytes, hex string)
   * @param option - uint32 option index (0, 1, 2, 3...)
   * @param amount - string representation of ELA amount (must match transferred amount)
   * @returns Hex string ready to be passed as memo to SDK
   */
  private async encodeVoteMemo(userVoteFlag: string, pollId: string, option: number, amount: string): Promise<Buffer> {
    // Use dynamic import for SmartBuffer like other files in codebase
    const { SmartBuffer } = await import('smart-buffer');
    const buffer = new SmartBuffer();

    // 1. userVoteFlag - Fixed-length string (as UTF-8 bytes)
    const flagBytes = Buffer.from(userVoteFlag, 'utf8');
    // Pad or truncate to exact byte length
    const paddedFlag = Buffer.alloc(this.USER_VOTE_FLAG_BYTE_LENGTH);
    flagBytes.copy(paddedFlag, 0, 0, Math.min(flagBytes.length, this.USER_VOTE_FLAG_BYTE_LENGTH));
    buffer.writeBuffer(paddedFlag);

    // 2. id - uint256 (32 bytes, big-endian for hash)
    const pollIdHex = pollId.replace(/^0x/i, ''); // Remove 0x if present
    if (pollIdHex.length !== 64) {
      throw new Error(`Poll ID must be exactly 64 hex characters (32 bytes), got ${pollIdHex.length} chars`);
    }
    const idBuffer = Buffer.from(pollIdHex, 'hex');
    buffer.writeBuffer(idBuffer);

    // 3. option - uint32 (4 bytes, little-endian)
    buffer.writeUInt32LE(option);

    // 4. amount length (1 byte) + amount - string (UTF-8 encoded)
    buffer.writeUInt8(amount.length);
    buffer.writeString(amount);

    return buffer.toBuffer();
  }

  /**
   * Get list of poll IDs
   * API: getpolls
   */
  async getPolls(): Promise<string[]> {
    if (this.pollIdsCache) {
      Logger.log(App.MAINCHAIN_POLLS, 'getPolls - returning cached IDs');
      return this.pollIdsCache;
    }

    try {
      const url = this.apiBaseUrl;

      // For now, test polls use type 255, live polls use type 1, and older
      // untyped polls use type 0 / no type.
      const params = USE_TEST_POLLS ? { type: 255 } : { type: 1 };

      const param = { jsonrpc: '2.0', method: 'getpolls', params, id: '1' };

      Logger.log(App.MAINCHAIN_POLLS, 'getpolls - calling:', url, 'with params:', params);

      const response = await this.globalJsonRPCService.httpPost(url, param, 'mainchain-polls');

      Logger.log(App.MAINCHAIN_POLLS, 'getpolls - response:', response);
      this.pollIdsCache = response?.ids || [];
      return this.pollIdsCache;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'getpolls error:', err);
      return [];
    }
  }

  /**
   * Sort polls based on their status:
   * - If all polls are active (voting), sort by startTime
   * - If there are any finished polls, sort by endTime
   */
  private sortPolls(polls: Poll[]): Poll[] {
    if (!polls || polls.length === 0) return polls;

    // Create a copy to avoid mutating the original array
    const sortedPolls = [...polls];

    // Check if there are any finished polls
    const hasFinished = sortedPolls.some(poll => poll.status === 'finished');

    if (hasFinished) {
      // If there are finished polls, sort by endTime (descending - newest first)
      return sortedPolls.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
    } else {
      // If all are active (voting), sort by startTime (descending - newest first)
      return sortedPolls.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0));
    }
  }

  /**
   * Get poll info for multiple polls
   * API: getPollInfo
   */
  async getPollInfo(ids: string[]): Promise<Poll[]> {
    if (!ids || ids.length === 0) return [];

    // Check if all requested IDs are in cache
    const cachedPolls: Poll[] = [];
    const idsToFetch: string[] = [];

    for (const id of ids) {
      if (this.pollInfoCache.has(id)) {
        cachedPolls.push(this.pollInfoCache.get(id)!);
      } else {
        idsToFetch.push(id);
      }
    }

    if (idsToFetch.length === 0) {
      Logger.log(App.MAINCHAIN_POLLS, 'getPollInfo - returning all cached polls');
      // Sort before returning
      return this.sortPolls(cachedPolls);
    }

    try {
      const url = this.apiBaseUrl;
      const param = {
        jsonrpc: '2.0',
        method: 'getpollinfo',
        params: { ids: idsToFetch },
        id: '1'
      };

      Logger.log(App.MAINCHAIN_POLLS, 'getPollInfo - calling:', url, 'ids to fetch:', idsToFetch);

      const fetchedPolls = await this.globalJsonRPCService.httpPost<Poll[]>(url, param, 'mainchain-polls');

      Logger.log(App.MAINCHAIN_POLLS, 'getPollInfo - fetched polls:', fetchedPolls);

      if (fetchedPolls && fetchedPolls.length > 0) {
        for (const poll of fetchedPolls) {
          this.pollInfoCache.set(poll.id, poll);
          cachedPolls.push(poll);
        }
      }

      // Sort polls based on status
      if (cachedPolls && cachedPolls.length > 0) {
        return this.sortPolls(cachedPolls);
      }

      return cachedPolls;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'getPollInfo error:', err);
      return cachedPolls; // Return whatever we have in cache if fetch fails
    }
  }

  /**
   * Get poll details including votes
   * API: getPollDetails
   */
  async getPollDetails(id: string): Promise<PollDetails | null> {
    if (this.pollDetailsCache.has(id)) {
      Logger.log(App.MAINCHAIN_POLLS, 'getPollDetails - returning cached details for:', id);
      return this.pollDetailsCache.get(id)!;
    }

    try {
      const url = this.apiBaseUrl;
      const param = {
        jsonrpc: '2.0',
        method: 'getpolldetails',
        params: { id }
      };

      Logger.log(App.MAINCHAIN_POLLS, 'getPollDetails - calling:', url, 'id:', id);

      const response = await this.globalJsonRPCService.httpPost<PollDetails>(url, param, 'mainchain-polls');

      Logger.log(App.MAINCHAIN_POLLS, 'getPollDetails - response:', response);
      if (response) {
        this.pollDetailsCache.set(id, response);
      }
      return response || null;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'getPollDetails error:', err);
      return null;
    }
  }

  /**
   * Submit a vote by creating a transaction with vote data in memo
   * @param pollId - Poll ID
   * @param option - Selected choice index
   * @param voteAmount - Vote amount in sELA (smallest unit), already calculated
   */
  async submitVote(
    pollId: string,
    option: number,
    voteAmount: BigNumber
  ): Promise<{ txid?: string; offlineTransactionKey?: string; offlineTransactionId?: string }> {
    try {
      Logger.log(
        App.MAINCHAIN_POLLS,
        'submitVote - pollId:',
        pollId,
        'option:',
        option,
        'voteAmount:',
        voteAmount.toString()
      );

      // Get mainchain subwallet
      const networkWallet = this.walletService.activeNetworkWallet.value;
      if (!networkWallet) {
        throw new Error('No active network wallet found');
      }

      // Get standard subwallets (includes ELA mainchain)
      const mainchainSubWallet = networkWallet.getSubWallet('ELA') as MainChainSubWallet;
      if (!mainchainSubWallet) {
        throw new Error('Mainchain subwallet not found');
      }

      // Get self address
      const selfAddress = mainchainSubWallet.getCurrentReceiverAddress();
      Logger.log(App.MAINCHAIN_POLLS, 'submitVote - selfAddress:', selfAddress);

      // Encode vote memo
      const amountString = voteAmount.dividedBy(Config.SELAAsBigNumber).toString(10); // Convert to ELA string
      const pollIdHex = pollId.replace(/^0x/i, '').padStart(64, '0').slice(0, 64);

      const voteMemo = await this.encodeVoteMemo(this.USER_VOTE_FLAG, pollIdHex, option, amountString);

      Logger.log(App.MAINCHAIN_POLLS, 'submitVote - voteMemoHex:', voteMemo);

      // Create transaction - send to self with vote amount
      const voteAmountELA = voteAmount.dividedBy(Config.SELAAsBigNumber);
      const rawTx = await mainchainSubWallet.createPaymentTransaction(selfAddress, voteAmountELA, voteMemo);

      if (!rawTx) {
        throw new Error('Failed to create payment transaction');
      }

      Logger.log(App.MAINCHAIN_POLLS, 'submitVote - rawTx created:', rawTx);

      // Sign and send
      const transfer = new Transfer();
      transfer.masterWalletId = networkWallet.masterWallet.id;
      transfer.subWalletId = StandardCoinName.ELA;

      const result = await mainchainSubWallet.signAndSendRawTransaction(
        rawTx,
        transfer,
        true, // navigateHomeAfterCompletion
        true, // forcePasswordPrompt
        true // visualFeedback
      );

      if (result.status === 'delegated') {
        // Mutisign wallet: Transaction signature has been delegated to another flow.
        Logger.log(App.MAINCHAIN_POLLS, 'submitVote - transaction delegated');
        return {
          offlineTransactionKey: result.offlineTransactionKey,
          offlineTransactionId: result.offlineTransactionId
        };
      } else {
        if (!result.published || !result.txid) {
          throw new Error(result.status === 'cancelled' ? 'Transaction cancelled' : 'Failed to publish transaction');
        }

        Logger.log(App.MAINCHAIN_POLLS, 'submitVote - transaction published:', result.txid);
      }
      return { txid: result.txid };
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'submitVote error:', err);
      throw err;
    }
  }

  /**
   * Get user's vote for a specific poll
   */
  async getUserVote(pollId: string, userAddress: string): Promise<Vote | null> {
    try {
      const details = await this.getPollDetails(pollId);
      if (!details || !details.votes) {
        return null;
      }

      return details.votes.find(vote => vote.voter.toLowerCase() === userAddress.toLowerCase());
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'getUserVote error:', err);
      return null;
    }
  }

  /**
   * Returns a list of other unfinished polls that the user has already voted for.
   * Voting for a new poll clears all previous votes in other open polls.
   */
  async getOtherUnfinishedVotedPolls(walletAddress: string, currentPollId: string): Promise<Poll[]> {
    try {
      // 1. Get all poll IDs
      const allPollIds = await this.getPolls();
      if (!allPollIds || allPollIds.length === 0) return [];

      // 2. Get info for all polls
      const allPolls = await this.getPollInfo(allPollIds);

      // 3. Filter for unfinished polls (status === 'voting') excluding current one
      const activePolls = allPolls.filter(p => p.status === 'voting' && p.id !== currentPollId);
      if (activePolls.length === 0) return [];

      // 4. For each active poll, check if user has voted
      // We check both local storage and API
      const unfinishedVotedPolls: Poll[] = [];
      for (const poll of activePolls) {
        const voted = await this.hasVoted(poll.id, walletAddress);
        if (voted) {
          unfinishedVotedPolls.push(poll);
        }
      }

      return unfinishedVotedPolls;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'getOtherUnfinishedVotedPolls error:', err);
      return [];
    }
  }

  /**
   * Save vote information to local storage (sandboxed per wallet address)
   * Also clears other unfinished votes from local storage.
   */
  async saveVoteToLocalStorage(
    pollId: string,
    option: number,
    voteAmount: BigNumber,
    walletAddress: string,
    offlineTransactionKey?: string, // For multisig wallets, the transaction key of the offline transaction.
    offlineTransactionId?: string // For multisig wallets, the transaction id of the offline transaction.
  ): Promise<void> {
    try {
      if (!walletAddress) {
        Logger.warn(App.MAINCHAIN_POLLS, 'Cannot save vote to local storage: wallet address is missing');
        return;
      }

      // First, clear other unfinished votes because this new vote on-chain will clear them.
      // Note: we do this BEFORE saving the new one to avoid clearing the new one if something goes wrong.
      const allPollIds = await this.getPolls();
      const allPolls = await this.getPollInfo(allPollIds);
      const otherUnfinishedPolls = allPolls.filter(p => p.status === 'voting' && p.id !== pollId);

      for (const poll of otherUnfinishedPolls) {
        await this.localStorage.removeVote(poll.id, walletAddress);
      }

      const storedVoteInfo: StoredVoteInfo = {
        pollId,
        voteAmount: voteAmount.toString(),
        voteTimestamp: Math.floor(Date.now() / 1000), // Unix timestamp
        option,
        walletAddress,
        offlineTransactionKey,
        offlineTransactionId
      };
      await this.localStorage.saveVote(storedVoteInfo);
      Logger.log(App.MAINCHAIN_POLLS, 'Vote saved to local storage:', pollId, 'for wallet:', walletAddress);
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error saving vote to local storage:', err);
      // Don't throw - this is not critical, vote was already submitted
    }
  }

  /**
   * Get stored vote information from local storage (sandboxed per wallet address)
   */
  async getStoredVote(pollId: string, walletAddress: string): Promise<StoredVoteInfo | null> {
    if (!walletAddress) {
      return null;
    }
    return await this.localStorage.getVote(pollId, walletAddress);
  }

  /**
   * Remove stored vote information from local storage (sandboxed per wallet address)
   */
  async removeStoredVote(pollId: string, walletAddress: string): Promise<void> {
    if (!walletAddress) {
      return;
    }
    await this.localStorage.removeVote(pollId, walletAddress);
  }

  /**
   * Check if user has voted on a poll (either from API or local storage)
   */
  async hasVoted(pollId: string, userAddress: string): Promise<boolean> {
    if (!userAddress) {
      return false;
    }
    // Check API first
    const apiVote = await this.getUserVote(pollId, userAddress);
    if (apiVote) {
      return true;
    }
    // Check local storage (sandboxed per wallet address)
    const storedVote = await this.getStoredVote(pollId, userAddress);
    return storedVote !== null;
  }

  /**
   * Clear all cached polls data.
   * Called when user manually refreshes the polls list.
   */
  public clearCache() {
    this.pollIdsCache = null;
    this.pollInfoCache.clear();
    this.pollDetailsCache.clear();
    Logger.log(App.MAINCHAIN_POLLS, 'Caches cleared');
  }
}
