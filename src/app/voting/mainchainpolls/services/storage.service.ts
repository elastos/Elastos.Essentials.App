import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { StoredVoteInfo } from '../model/stored-vote-info.model';

/**
 * Local storage service for mainchain polls.
 * Stores voted poll information.
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorage {
  public static instance: LocalStorage = null;

  constructor(private storage: GlobalStorageService) {
    LocalStorage.instance = this;
  }

  /**
   * Get storage key for a specific wallet address
   */
  private getStorageKey(walletAddress: string): string {
    // Normalize address to lowercase for consistent storage
    const normalizedAddress = walletAddress.toLowerCase();
    return `voted-polls-${normalizedAddress}`;
  }

  /**
   * Save vote information for a poll (sandboxed per wallet address)
   */
  public async saveVote(voteInfo: StoredVoteInfo): Promise<void> {
    try {
      if (!voteInfo.walletAddress) {
        throw new Error('Wallet address is required to save vote');
      }
      const votes = await this.getAllVotesForWallet(voteInfo.walletAddress);
      // Update or add vote for this poll
      const existingIndex = votes.findIndex(v => v.pollId === voteInfo.pollId);
      if (existingIndex >= 0) {
        votes[existingIndex] = voteInfo;
      } else {
        votes.push(voteInfo);
      }
      const storageKey = this.getStorageKey(voteInfo.walletAddress);
      await this.set(storageKey, JSON.stringify(votes));
      Logger.log(
        App.MAINCHAIN_POLLS,
        'Vote saved to local storage:',
        voteInfo.pollId,
        'for wallet:',
        voteInfo.walletAddress
      );
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error saving vote to local storage:', err);
      throw err;
    }
  }

  /**
   * Get vote information for a specific poll (sandboxed per wallet address)
   */
  public async getVote(pollId: string, walletAddress: string): Promise<StoredVoteInfo | null> {
    try {
      if (!walletAddress) {
        return null;
      }
      const votes = await this.getAllVotesForWallet(walletAddress);
      return votes.find(v => v.pollId === pollId) || null;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error getting vote from local storage:', err);
      return null;
    }
  }

  /**
   * Get all stored votes for a specific wallet address
   */
  public async getAllVotesForWallet(walletAddress: string): Promise<StoredVoteInfo[]> {
    try {
      if (!walletAddress) {
        return [];
      }
      const storageKey = this.getStorageKey(walletAddress);
      const rawVotes = await this.get(storageKey);
      if (!rawVotes) {
        return [];
      }
      if (typeof rawVotes === 'string') {
        return JSON.parse(rawVotes);
      }
      return rawVotes;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error getting all votes from local storage:', err);
      return [];
    }
  }

  /**
   * Remove vote information for a specific poll (sandboxed per wallet address)
   */
  public async removeVote(pollId: string, walletAddress: string): Promise<void> {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required to remove vote');
      }
      const votes = await this.getAllVotesForWallet(walletAddress);
      const filteredVotes = votes.filter(v => v.pollId !== pollId);
      const storageKey = this.getStorageKey(walletAddress);
      await this.set(storageKey, JSON.stringify(filteredVotes));
      Logger.log(App.MAINCHAIN_POLLS, 'Vote removed from local storage:', pollId, 'for wallet:', walletAddress);
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error removing vote from local storage:', err);
      throw err;
    }
  }

  /**
   * Check if a poll has been voted on (sandboxed per wallet address)
   */
  public async hasVoted(pollId: string, walletAddress: string): Promise<boolean> {
    const vote = await this.getVote(pollId, walletAddress);
    return vote !== null;
  }

  private set(key: string, value: any): Promise<void> {
    return this.storage.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'mainchainpolls',
      key,
      value,
      'browserlocalstorage'
    );
  }

  private async get(key: string): Promise<any> {
    const val = await this.storage.getSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'mainchainpolls',
      key,
      null,
      'browserlocalstorage'
    );
    if (val === null) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        // Do nothing. Saved value is probably a real string
        return val;
      }
    }
    return val;
  }
}
