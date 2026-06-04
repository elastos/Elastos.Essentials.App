import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BigNumber } from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { AnyOfflineTransaction } from 'src/app/wallet/model/tx-providers/transaction.types';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { PollDetails } from '../../model/poll-details.model';
import { PollStatus } from '../../model/poll-status.enum';
import { Poll } from '../../model/poll.model';
import { StoredVoteInfo } from '../../model/stored-vote-info.model';
import { Vote } from '../../model/vote.model';
import { MainchainPollsService } from '../../services/mainchain-polls.service';

@Component({
  selector: 'app-poll-detail',
  templateUrl: './poll-detail.page.html',
  styleUrls: ['./poll-detail.page.scss']
})
export class PollDetailPage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public pollId: string;
  public pollDetails: PollDetails | null = null;
  public loading = false;
  public loadingWalletInfo = false;
  public voting = false;

  // Wallet info
  public walletAddress = '';
  public walletBalance: BigNumber | null = null;
  public availableBalance: BigNumber | null = null; // Balance - 1 ELA for fees
  public userVote: Vote | null = null;
  public storedVote: StoredVoteInfo | null = null; // Vote from local storage
  public walletUnavailable = false;

  public selectedChoice: number | null = null;
  public otherUnfinishedVotedPolls: Poll[] = []; // Other polls that have been voted on and are still active

  // For multisig wallets, check if the offline transaction is on chain or not.
  public offlineTransactions: AnyOfflineTransaction[] = [];
  public isTransactionPending = false;
  public isCheckingOfflineTransaction = false;

  // Polling for vote confirmation
  private readonly POLLING_INTERVAL_MS = 30000; // 30 seconds
  private pollingTimer: any = null;
  private isPolling = false;

  constructor(
    public theme: GlobalThemeService,
    private pollsService: MainchainPollsService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    private walletNetworkService: WalletNetworkService,
    private walletService: WalletService,
    private popupService: GlobalPopupService,
    private globalNative: GlobalNativeService,
    private ngZone: NgZone
  ) {
    this.pollId = this.route.snapshot.params.id;
  }

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.init();
  }

  ionViewWillLeave() {
    this.stopPollingForVoteConfirmation();
  }

  ngOnDestroy() {
    this.stopPollingForVoteConfirmation();
  }

  async init() {
    this.titleBar.setTitle(this.translate.instant('mainchainpolls.poll-detail'));
    await this.loadPollDetails();
    await this.loadWalletInfo();
  }

  /**
   * Check if a stored vote has timed out (30 minutes)
   */
  private isStoredVoteExpired(storedVote: StoredVoteInfo): boolean {
    if (!storedVote || !storedVote.voteTimestamp) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - storedVote.voteTimestamp;
    return elapsed > MainchainPollsService.PENDING_VOTE_TIMEOUT_SEC;
  }

  /**
   * Start polling for vote confirmation when there's a stored vote but no API confirmation
   */
  private startPollingForVoteConfirmation() {
    // Only start polling if we have a stored vote but no user vote (waiting for confirmation)
    if (this.storedVote && !this.userVote && !this.isTransactionPending) {
      if (this.isPolling) {
        return;
      }

      // If the stored vote is already expired, don't start polling and clear it
      if (this.isStoredVoteExpired(this.storedVote)) {
        Logger.log(App.MAINCHAIN_POLLS, 'Stored vote expired, not starting polling');
        void this.pollsService.removeStoredVote(this.pollId, this.walletAddress);
        this.storedVote = null;
        return;
      }

      Logger.log(App.MAINCHAIN_POLLS, 'Starting polling for vote confirmation');
      this.isPolling = true;

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.pollingTimer = setInterval(async () => {
        Logger.log(App.MAINCHAIN_POLLS, 'Polling for vote confirmation...');
        await this.ngZone.run(async () => {
          // Clear cache to ensure we get fresh data from the API
          this.pollsService.clearCache();
          await this.loadPollDetails(true);
          await this.loadWalletInfo(true);
        });

        // Stop polling if we now have a user vote (confirmation received)
        if (this.userVote) {
          Logger.log(App.MAINCHAIN_POLLS, 'Vote confirmed, stopping polling');
          this.stopPollingForVoteConfirmation();
        }

        // Stop polling if stored vote is now expired
        if (this.storedVote && this.isStoredVoteExpired(this.storedVote)) {
          Logger.log(App.MAINCHAIN_POLLS, 'Stored vote expired during polling, stopping');
          this.stopPollingForVoteConfirmation();
          // Force a non-silent refresh to update UI state
          await this.loadWalletInfo();
        }
      }, this.POLLING_INTERVAL_MS);
    } else {
      // If we don't need polling anymore, stop it
      this.stopPollingForVoteConfirmation();
    }
  }

  /**
   * Stop polling for vote confirmation
   */
  private stopPollingForVoteConfirmation() {
    if (this.pollingTimer) {
      Logger.log(App.MAINCHAIN_POLLS, 'Stopping polling for vote confirmation');
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
  }

  async loadPollDetails(silent = false) {
    try {
      if (!silent) this.loading = true;
      const details = await this.pollsService.getPollDetails(this.pollId);
      if (details) {
        this.pollDetails = details;
      }
      if (!silent) this.loading = false;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'loadPollDetails error:', err);
      if (!silent) this.loading = false;
    }
  }

  hasValidUrl(): boolean {
    const url = this.pollDetails?.url?.trim();
    return !!url && url.toLowerCase().startsWith('http');
  }

  copyPollUrl() {
    if (!this.hasValidUrl()) {
      return;
    }

    void this.globalNative.copyClipboard(this.pollDetails?.url || '');
    this.globalNative.genericToast('mainchainpolls.url-copied');
  }

  async loadWalletInfo(silent = false) {
    try {
      if (!silent) {
        this.loadingWalletInfo = true;
        this.walletUnavailable = false;
        this.walletAddress = '';
        this.walletBalance = null;
        this.availableBalance = null;
        this.userVote = null;
        this.storedVote = null;
      }

      const networkWallet = this.walletService.activeNetworkWallet.value;
      if (!networkWallet) {
        Logger.warn(App.MAINCHAIN_POLLS, 'No active network wallet');
        this.walletUnavailable = true;
        if (!silent) this.loadingWalletInfo = false;
        return;
      }

      const mainchainNetwork = this.walletNetworkService.getNetworkByKey('elastos');
      if (!mainchainNetwork) {
        Logger.warn(App.MAINCHAIN_POLLS, 'Elastos mainchain network not found');
        this.walletUnavailable = true;
        if (!silent) this.loadingWalletInfo = false;
        return;
      }

      if (!networkWallet.masterWallet.supportsNetwork(mainchainNetwork)) {
        Logger.warn(
          App.MAINCHAIN_POLLS,
          'Active master wallet does not support the mainchain network (likely imported private key)'
        );
        this.walletUnavailable = true;
        if (!silent) this.loadingWalletInfo = false;
        return;
      }

      const mainchainSubWallet = networkWallet.getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;
      if (!mainchainSubWallet) {
        Logger.warn(App.MAINCHAIN_POLLS, 'Mainchain subwallet not found');
        this.walletUnavailable = true;
        if (!silent) this.loadingWalletInfo = false;
        return;
      }

      // Get address
      this.walletAddress = mainchainSubWallet.getCurrentReceiverAddress();
      Logger.log(App.MAINCHAIN_POLLS, 'Wallet address:', this.walletAddress);

      // Get balance
      const totalBalance = await mainchainSubWallet.getTotalBalanceByType(true, false);
      this.walletBalance = totalBalance;
      if (this.walletBalance) {
        this.availableBalance = this.pollsService.calculateVoteAmount(this.walletBalance);
        if (this.availableBalance.isLessThanOrEqualTo(0)) {
          this.availableBalance = new BigNumber(0);
        }
      }

      // Load stored vote from local storage (sandboxed per wallet address)
      if (this.pollId && this.walletAddress) {
        let storedVote = await this.pollsService.getStoredVote(this.pollId, this.walletAddress);

        // If not found with current address, but we already had one, keep it!
        // This handles cases where the current receiver address might have changed.
        if (!storedVote && this.storedVote) {
          storedVote = this.storedVote;
        }

        if (storedVote && this.isStoredVoteExpired(storedVote)) {
          Logger.log(App.MAINCHAIN_POLLS, 'Stored vote expired, removing');
          await this.pollsService.removeStoredVote(this.pollId, storedVote.walletAddress);
          this.storedVote = null;
        } else {
          this.storedVote = storedVote;
        }

        // For multisig wallets, check if the offline transaction is on chain or not.
        if (this.storedVote && this.storedVote.offlineTransactionId) {
          this.isCheckingOfflineTransaction = true;

          // Load offline transactions for multisig wallets
          this.offlineTransactions = (await mainchainSubWallet.getOfflineTransactions()) || [];
          const isTransactionInOfflineTransactions =
            this.offlineTransactions.findIndex(tx => tx.transactionKey === this.storedVote.offlineTransactionKey) !==
            -1;
          if (!isTransactionInOfflineTransactions) {
            // If the offline transaction is not found, check if the transaction is on chain.
            const txRawTx = await GlobalElastosAPIService.instance.getRawTransaction(
              this.storedVote.offlineTransactionId
            );
            if (txRawTx) {
              // The transaction is on chain, remove offlinetransaction key and id from stored vote
              await this.pollsService.saveVoteToLocalStorage(
                this.storedVote.pollId,
                this.storedVote.option,
                new BigNumber(this.storedVote.voteAmount),
                this.storedVote.walletAddress
              );
              this.isTransactionPending = false;
            } else {
              // The transaction is not on chain, maybe user deleted the transaction, so delete the stored vote.
              await this.pollsService.removeStoredVote(this.pollId, this.walletAddress);
              this.storedVote = null;
            }
          } else {
            this.isTransactionPending = true;
          }
          this.isCheckingOfflineTransaction = false;
        }
      }

      // Load user vote from API if exists
      if (this.pollId && this.walletAddress) {
        // Use the address from stored vote if available, as it's the one that was used to vote
        const addressToCheck = this.storedVote ? this.storedVote.walletAddress : this.walletAddress;
        const userVote = await this.pollsService.getUserVote(this.pollId, addressToCheck);
        this.userVote = userVote;

        // Check if there are other unfinished polls already voted on
        this.otherUnfinishedVotedPolls = await this.pollsService.getOtherUnfinishedVotedPolls(
          this.walletAddress,
          this.pollId
        );
      }

      // Start polling if we have a stored vote but no API confirmation
      this.startPollingForVoteConfirmation();
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'loadWalletInfo error:', err);
    } finally {
      if (!silent) this.loadingWalletInfo = false;
    }
  }

  selectChoice(choiceIndex: number) {
    if (this.hasAlreadyVoted()) {
      // Already voted
      return;
    }
    this.selectedChoice = choiceIndex;
  }

  async vote() {
    if (this.selectedChoice === null || this.selectedChoice === undefined) {
      await this.popupService.ionicAlert('mainchainpolls.select-choice', 'mainchainpolls.select-choice-message');
      return;
    }

    // Check minimum balance requirement (need more than 1 ELA)
    const oneELA = new BigNumber(1).multipliedBy(Config.SELAAsBigNumber);
    if (!this.walletBalance || this.walletBalance.isLessThanOrEqualTo(oneELA)) {
      this.globalNative.genericToast('mainchainpolls.insufficient-balance-toast', 3000);
      return;
    }

    if (!this.availableBalance || this.availableBalance.isLessThanOrEqualTo(0)) {
      this.globalNative.genericToast('mainchainpolls.insufficient-balance-toast', 3000);
      return;
    }

    // Show confirmation
    const confirmed = await this.showVoteConfirmation();
    if (!confirmed) {
      return;
    }

    try {
      this.voting = true;
      Logger.log(App.MAINCHAIN_POLLS, 'Submitting vote - pollId:', this.pollId, 'choice:', this.selectedChoice);

      const result = await this.pollsService.submitVote(this.pollId, this.selectedChoice, this.availableBalance);
      const txId = result.txid;
      const offlineTransactionKey = result.offlineTransactionKey;
      const offlineTransactionId = result.offlineTransactionId;
      Logger.log(App.MAINCHAIN_POLLS, 'Vote submitted, txId:', txId);

      // Clear cache after voting as on-chain state has changed
      this.pollsService.clearCache();

      // Save vote to local storage (sandboxed per wallet address)
      if (this.pollDetails && this.walletAddress) {
        await this.pollsService.saveVoteToLocalStorage(
          this.pollId,
          this.selectedChoice,
          this.availableBalance,
          this.walletAddress,
          offlineTransactionKey,
          offlineTransactionId
        );
      }

      // Multisign wallet: Need to wait for other signers to sign before publishing, so don't show success message here.
      if (txId) {
        const successMessage = this.translate.instant('mainchainpolls.vote-success-message', { txId });
        await this.popupService.ionicAlert('mainchainpolls.vote-success', successMessage);
      }

      // Reload poll details and wallet info
      await this.loadPollDetails();
      await this.loadWalletInfo();
      this.selectedChoice = null;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Vote error:', err);
      await this.popupService.ionicAlert(
        'mainchainpolls.vote-error',
        err.message || 'mainchainpolls.vote-error-message'
      );
    } finally {
      this.voting = false;
    }
  }

  private async showVoteConfirmation(): Promise<boolean> {
    const voteAmountString = this.availableBalance.dividedBy(Config.SELAAsBigNumber).toFixed(3);

    let message = this.translate.instant('mainchainpolls.confirm-vote-message', {
      amount: voteAmountString
    });

    if (this.otherUnfinishedVotedPolls.length > 0) {
      message += '\n\n' + this.translate.instant('mainchainpolls.votes-will-be-cleared-warning');
    }

    const confirmed = await this.popupService.showConfirmationPopup(
      this.translate.instant('mainchainpolls.confirm-vote'),
      message,
      this.translate.instant('common.confirm'),
      '' // No icon
    );

    return confirmed;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  formatBalance(balance: BigNumber | null): string {
    if (!balance) {
      return '0';
    }
    return balance.dividedBy(Config.SELAAsBigNumber).toFixed(3);
  }

  formatVoteAmount(amount: string): string {
    if (!amount) {
      return '0';
    }
    try {
      // Amount is already in ELA units (from API or normalized from stored vote)
      const amountBN = new BigNumber(amount);
      return amountBN.toFixed(2);
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'Error formatting vote amount:', err);
      return amount;
    }
  }

  getStatusClass(status: PollStatus | string): string {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : status;
    if (normalizedStatus === 'voting') {
      return 'active';
    } else if (normalizedStatus === 'finished') {
      return 'ended';
    } else {
      return 'upcoming';
    }
  }

  isPollActive(pollDetails: PollDetails | null): boolean {
    if (!pollDetails) {
      return false;
    }
    const status: PollStatus = pollDetails.status;
    return status === 'voting';
  }

  isPollNotActive(pollDetails: PollDetails | null): boolean {
    if (!pollDetails) {
      return false;
    }
    return !this.isPollActive(pollDetails);
  }

  getPollInactiveMessage(pollDetails: PollDetails | null): string {
    if (!pollDetails) {
      return '';
    }
    const status: PollStatus = pollDetails.status;
    if (status === 'finished') {
      return this.translate.instant('mainchainpolls.poll-finished');
    } else if (status === 'upcoming') {
      return this.translate.instant('mainchainpolls.poll-not-started');
    }
    return this.translate.instant('mainchainpolls.poll-not-active');
  }

  getPollInactiveStatusClass(pollDetails: PollDetails | null): string {
    if (!pollDetails) {
      return '';
    }
    const status: PollStatus = pollDetails.status;
    if (status === 'finished') {
      return 'finished';
    } else if (status === 'upcoming') {
      return 'upcoming';
    }
    return '';
  }

  getPollInactiveClasses(pollDetails: PollDetails | null): string {
    const baseClass = 'cannot-vote-info';
    const statusClass = this.getPollInactiveStatusClass(pollDetails);
    return statusClass ? `${baseClass} ${statusClass}` : baseClass;
  }

  canVote(): boolean {
    if (!this.pollDetails) {
      return false;
    }
    if (this.walletUnavailable) {
      return false; // No eligible wallet for voting
    }
    if (!this.walletAddress) {
      return false; // Wallet not loaded
    }
    if (this.hasAlreadyVoted()) {
      return false; // Already voted
    }
    if (!this.isPollActive(this.pollDetails)) {
      return false; // Poll not active
    }
    if (!this.availableBalance || this.availableBalance.isLessThanOrEqualTo(0)) {
      return false; // Insufficient balance
    }
    return true;
  }

  /**
   * Check if user has already voted (either from API or local storage)
   */
  hasAlreadyVoted(): boolean {
    return !this.isCheckingOfflineTransaction && (!!this.userVote || !!this.storedVote);
  }

  /**
   * Get the vote information to display (prefer API vote over stored vote)
   */
  getDisplayVote(): Vote | null {
    if (this.userVote) {
      return this.userVote;
    }
    if (this.storedVote) {
      // Convert StoredVoteInfo to Vote object for display
      // Stored vote amount is in sELA, convert to ELA for consistency with API votes
      const voteAmountELA = new BigNumber(this.storedVote.voteAmount).dividedBy(Config.SELAAsBigNumber).toString(10);
      return {
        voter: this.walletAddress || '',
        amount: voteAmountELA,
        choice: this.storedVote.option
      };
    }
    return null;
  }

  /**
   * Get vote option/choice index
   */
  getVoteOption(): number | null {
    const displayVote = this.getDisplayVote();
    if (!displayVote) {
      return null;
    }
    return displayVote.choice;
  }

  /**
   * Calculate poll results by aggregating votes by choice
   */
  getPollResults(): Array<{
    choiceIndex: number;
    choiceTitle: string;
    voteAmount: BigNumber;
    percentage: number;
    voteCount: number;
  }> {
    if (!this.pollDetails) {
      return [];
    }

    // For finished polls, show results even if there are no votes
    const isFinished = this.pollDetails.status === 'finished';
    const hasVotes = this.pollDetails.votes && this.pollDetails.votes.length > 0;

    if (!hasVotes && !isFinished) {
      return [];
    }

    // Aggregate votes by choice
    const votesByChoice: Map<number, { totalAmount: BigNumber; count: number }> = new Map();

    if (this.pollDetails.votes && this.pollDetails.votes.length > 0) {
      this.pollDetails.votes.forEach(vote => {
        const choiceIndex = vote.choice;
        // Vote amount from API is already in ELA units (not sELA)
        const voteAmount = new BigNumber(vote.amount);

        if (votesByChoice.has(choiceIndex)) {
          const existing = votesByChoice.get(choiceIndex);
          if (existing) {
            existing.totalAmount = existing.totalAmount.plus(voteAmount);
            existing.count += 1;
          }
        } else {
          votesByChoice.set(choiceIndex, {
            totalAmount: voteAmount,
            count: 1
          });
        }
      });
    }

    // Calculate total votes
    let totalVotes = new BigNumber(0);
    votesByChoice.forEach(value => {
      totalVotes = totalVotes.plus(value.totalAmount);
    });

    // Build results array
    const results: Array<{
      choiceIndex: number;
      choiceTitle: string;
      voteAmount: BigNumber;
      percentage: number;
      voteCount: number;
    }> = [];

    this.pollDetails.choices.forEach((choiceTitle, index) => {
      const voteData = votesByChoice.get(index);
      const voteAmount = voteData ? voteData.totalAmount : new BigNumber(0);
      const voteCount = voteData ? voteData.count : 0;
      const percentage = totalVotes.isGreaterThan(0)
        ? voteAmount.dividedBy(totalVotes).multipliedBy(100).toNumber()
        : 0;

      results.push({
        choiceIndex: index,
        choiceTitle,
        voteAmount,
        percentage,
        voteCount
      });
    });

    // Sort by vote amount descending
    results.sort((a, b) => b.voteAmount.comparedTo(a.voteAmount));

    return results;
  }

  /**
   * Get total votes amount
   */
  getTotalVotesAmount(): BigNumber {
    if (!this.pollDetails || !this.pollDetails.votes || this.pollDetails.votes.length === 0) {
      return new BigNumber(0);
    }

    let total = new BigNumber(0);
    // Vote amounts from API are already in ELA units (not sELA)
    this.pollDetails.votes.forEach(vote => {
      total = total.plus(new BigNumber(vote.amount));
    });

    return total;
  }

  /**
   * Format percentage for display
   */
  formatPercentage(percentage: number): string {
    return percentage.toFixed(2);
  }
}
