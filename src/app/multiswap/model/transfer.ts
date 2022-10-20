import BigNumber from "bignumber.js";
import { BehaviorSubject } from "rxjs";
import { sleep } from "src/app/helpers/sleep.helper";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { NetworkTemplateStore } from "src/app/services/stores/networktemplate.store";
import { Coin } from "src/app/wallet/model/coin";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EVMNetworkWallet } from "src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { AuthService } from "src/app/wallet/services/auth.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { ChaingeSwapService } from "../services/chaingeswap.service";
import { AmountTooLowException, NoRouteException, OrderStatus, UnsupportedTokenOrChainException } from "./chainge.types";

export enum TransferStep {
  NEW = "new",
  PUBLISHING = "swap_tx_publishing",
  PUBLISHED = "swap_tx_published",
  REJECTED = "swap_tx_rejected",
  COMPLETED = "completed"
}

type TransferStatus = {
  step: TransferStep;
  lastError?: string;
  canContinue: boolean;
  canDismiss: boolean;
}

type SwapStep = {
  // State
  orderId?: string;

  // Computed
  fees: number; // Total swap fees in source token amount.
  feesPercent: number; // 0-1 - Total swap fees in percentage of the input amount.
  slippage: number; // 0-1
}

/**
 * Transfer on disk
 */
type SerializedTransfer = {
  // Config
  masterWalletId: string; // Main reference to the creating wallet, to make sure we always resume operations on this wallet even after restarting
  sourceToken: {
    network: string // Network key;
    coinId: string; // For ERC20 tokens, this is the token address
  };
  destinationToken: {
    network: string // Network key;
    coinId: string; // For ERC20 tokens, this is the token address
  }
  amount: string;

  // Global state machine
  currentStep: TransferStep;
  userAgreed: boolean;

  // Computed steps
  swapStep: SwapStep;
  estimatedReceivedAmount: string; // Number of destination tokens received after all operations are completed, and after deduction of all fees and commissions
}

export class Transfer {
  masterWalletId: string;
  sourceToken: Coin = null;
  destinationToken: Coin = null
  amount: BigNumber = null;
  currentStep: TransferStep = TransferStep.NEW;
  swapStep: SwapStep = null;
  estimatedReceivedAmount: BigNumber = null; // Readable number of tokens
  canExecute: boolean; // Whether the transfer can safely be executed or not (balance / route / swap slippage check)
  cannotExecuteReason: string = null;
  userAgreed: boolean;

  // Computed
  private sourceNetworkSubWallet: AnyMainCoinEVMSubWallet = null; // subwallet instance on the bridge source network
  private destinationNetworkSubWallet: AnyMainCoinEVMSubWallet = null; // subwallet instance on the destination network

  // Ephemeral, reseted when coming back to the bridge screen
  private promptPayPassword = true; // Prompt the first time on the screen, but not for all transactions.

  public status = new BehaviorSubject<TransferStatus>({
    step: this.currentStep,
    lastError: null,
    canContinue: false,
    canDismiss: false
  });

  public computing = new BehaviorSubject<boolean>(false); // Transfer values are being computed. This involves networking.

  protected constructor() { }

  /**
   * Loads the on going transfer from persistence if there is one.
   */
  public static async loadExistingTransfer(): Promise<Transfer> {
    let serializedTransfer: SerializedTransfer = await GlobalStorageService.instance.getSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString,
      NetworkTemplateStore.networkTemplate, "multiswap", "activetransfer", null);
    if (!serializedTransfer)
      return null;

    let transfer = new Transfer();

    transfer.masterWalletId = serializedTransfer.masterWalletId;
    let sourceNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByKey(serializedTransfer.sourceToken.network);
    if (!sourceNetwork) {
      Logger.warn("multiswap", `Source network ${serializedTransfer.sourceToken.network} not found, unable to restore previous transfer state`);
      return null;
    }

    transfer.sourceToken = sourceNetwork.getCoinByID(serializedTransfer.sourceToken.coinId);
    if (!transfer.sourceToken) {
      Logger.warn("multiswap", `Source token ${serializedTransfer.sourceToken.coinId} not found, unable to restore previous transfer state`);
      return null;
    }

    let destNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByKey(serializedTransfer.destinationToken.network);
    if (!destNetwork) {
      Logger.warn("multiswap", `Destination network ${serializedTransfer.destinationToken.network} not found, unable to restore previous transfer state`);
      return null;
    }

    transfer.destinationToken = destNetwork.getCoinByID(serializedTransfer.destinationToken.coinId);
    if (!transfer.destinationToken) {
      Logger.warn("multiswap", `Destination token ${serializedTransfer.destinationToken.coinId} not found, unable to restore previous transfer state`);
      return null;
    }

    transfer.amount = new BigNumber(serializedTransfer.amount);
    transfer.currentStep = serializedTransfer.currentStep;
    transfer.swapStep = serializedTransfer.swapStep;
    transfer.estimatedReceivedAmount = serializedTransfer.estimatedReceivedAmount ? new BigNumber(serializedTransfer.estimatedReceivedAmount) : null;
    transfer.userAgreed = serializedTransfer.userAgreed;

    return transfer;
  }

  public static prepareNewTransfer(masterWalletId: string, sourceToken: Coin, destinationToken: Coin, amount: BigNumber): Transfer {
    let transfer = new Transfer();

    void transfer.compute(masterWalletId, sourceToken, destinationToken, amount).then(() => {
      void transfer.save();
    })

    return transfer;
  }

  /**
   * Save current transfer to disk to be able to resume later
   */
  private save(): Promise<void> {
    let serializedTransfer: SerializedTransfer = {
      masterWalletId: this.masterWalletId,
      sourceToken: {
        network: this.sourceToken.network.key,
        coinId: this.sourceToken.getID()
      },
      destinationToken: {
        network: this.destinationToken.network.key,
        coinId: this.destinationToken.getID()
      },
      amount: this.amount.toString(10),
      currentStep: this.currentStep,
      swapStep: Object.assign({}, this.swapStep),
      estimatedReceivedAmount: this.estimatedReceivedAmount ? this.estimatedReceivedAmount.toString(10) : null,
      userAgreed: this.userAgreed
    };

    return GlobalStorageService.instance.setSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString,
      NetworkTemplateStore.networkTemplate, "multiswap", "activetransfer", serializedTransfer);
  }

  public reset() {
    return GlobalStorageService.instance.deleteSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString,
      NetworkTemplateStore.networkTemplate, "multiswap", "activetransfer");
  }

  /**
   * Initial computation
   */
  private async compute(masterWalletId: string, sourceToken: Coin, destinationToken: Coin, amount: BigNumber): Promise<void> {
    this.masterWalletId = masterWalletId;
    this.sourceToken = sourceToken;
    this.destinationToken = destinationToken;
    this.amount = amount;
    this.swapStep = null;
    this.estimatedReceivedAmount = null;
    this.canExecute = false;

    await this.updateComputations();
  }

  /**
   * Differential computation: refreshes only part of the computation (eg: most recent swap values) but without any change on the
   * input values passed to compute().
   */
  public async updateComputations(): Promise<void> {
    Logger.log("multiswap", "Computing transfer information", this.masterWalletId, this.sourceToken, this.destinationToken, this.amount);

    this.computing.next(true);

    // Unless said otherwise below, we may be able to execute the transfer.
    this.canExecute = true;
    this.cannotExecuteReason = GlobalTranslationService.instance.translateInstant('easybridge.error-unknown');

    let masterWallet = WalletService.instance.getMasterWallet(this.masterWalletId);
    let sourceNetwork = <EVMNetwork>this.sourceToken.network;
    let destinationNetwork = <EVMNetwork>this.destinationToken.network;

    // Get a network wallet for the target source chain - don't launch its background services
    let sourceNetworkWallet = await sourceNetwork.createNetworkWallet(masterWallet, false);
    if (!(sourceNetworkWallet instanceof EVMNetworkWallet)) {
      this.computing.next(false);
      throw new Error("Multiswap service can only be used with EVM networks");
    }

    // Get a network wallet for the target source chain - don't launch its background services
    let destinationNetworkWallet = await destinationNetwork.createNetworkWallet(masterWallet, false);
    if (!(destinationNetworkWallet instanceof EVMNetworkWallet)) {
      this.computing.next(false);
      throw new Error("Multiswap service can only be used with EVM networks");
    }

    this.sourceNetworkSubWallet = sourceNetworkWallet.getMainEvmSubWallet();
    this.destinationNetworkSubWallet = destinationNetworkWallet.getMainEvmSubWallet();

    try {
      let { fees, slippage, amountOut } = await ChaingeSwapService.instance.getSwapQuote(this.sourceNetworkSubWallet, this.sourceToken, this.amount, this.destinationToken);

      // Chainge fees are in number of input tokens. We convert this to percentage
      let feesPercent = fees / this.amount.toNumber();
      this.swapStep = {
        fees,
        feesPercent,
        slippage
      }

      this.estimatedReceivedAmount = new BigNumber(amountOut);
    }
    catch (e) {
      this.canExecute = false;
      if (e instanceof UnsupportedTokenOrChainException)
        this.cannotExecuteReason = "Unsupported tokens for swap";
      else if (e instanceof NoRouteException)
        this.cannotExecuteReason = "No way to directly route tokens. Please manually swap to intermediate tokens";
      else if (e instanceof AmountTooLowException)
        this.cannotExecuteReason = "Amount is too low to cover transaction fees, please set a higher amount";
      else
        this.cannotExecuteReason = "Unknown error";
    }

    this.emitPostComputationStatus();
    this.computing.next(false);
  }

  private emitPostComputationStatus() {
    if (this.canExecute) {
      this.emitStatus(); // Emit an initial status right after the initial setup
    }
    else {
      this.emitStatus(this.cannotExecuteReason);
    }
  }

  /**
   * Executes all the transfer steps: bridge, faucet and swap. The process resumes where it was interrupted.
   *
   * The status event is called every time a significant step is completed and the transfer
   * object (this) is updated (transaction sent), api confirmed, etc.
   */
  public async execute(): Promise<void> {
    let autoProcessNextStep = true;
    while (autoProcessNextStep) {
      switch (this.currentStep) {
        case TransferStep.NEW:
          // First step
          if (!await this.checkUnlockMasterPassword())
            autoProcessNextStep = false;
          else
            autoProcessNextStep = await this.executeSwap();
          break;
        case TransferStep.PUBLISHED:
          autoProcessNextStep = await this.awaitOrderCompletion();
          break;
        case TransferStep.COMPLETED:
          autoProcessNextStep = false; // loop end
          break;
        default:
          throw new Error(`Unknown step ${this.currentStep}`);
      }

      await sleep(500);
    }
  }

  private async executeSwap(): Promise<boolean> {
    Logger.log("multiswap", "Recomputing swap data just before swapping");
    await this.updateComputations();

    Logger.log("multiswap", "Executing the swap");
    let orderId: string;
    try {
      this.currentStep = TransferStep.PUBLISHING;

      orderId = await ChaingeSwapService.instance.executeSwap(this.sourceNetworkSubWallet, this.sourceToken, this.amount, this.destinationToken);
      console.log("txId", orderId);

      if (orderId) {
        Logger.log("multiswap", "Swap complete");

        this.currentStep = TransferStep.PUBLISHED;
        this.swapStep.orderId = orderId;
        await this.save();
        this.emitStatus();

        return true;
      }
    }
    catch (e) {
      // Gas estimation error, network error...
      Logger.log("multiswap", "executeSwapTrade() error:", e);
      // Fallthrough
    }

    if (!orderId) {
      Logger.log("multiswap", "Swap failed");

      this.emitStatus(GlobalTranslationService.instance.translateInstant('easybridge.error-swap-failed'));

      return false;
    }
  }

  /**
   * Awaits the final order status, based on a previously obtained order id.
   * The result of this await can be either completed (tokens arrived at destination), or an error.
   */
  private async awaitOrderCompletion(): Promise<boolean> {
    let order = await ChaingeSwapService.instance.getOrderDetails(this.sourceNetworkSubWallet, this.swapStep.orderId);

    if (order) {
      if (order.status === OrderStatus.COMPLETED) {
        await this.executeCompletion();
        return false;
      }
      else if (order.status === OrderStatus.FAILED) {
        this.currentStep = TransferStep.REJECTED;
        await this.save();
        this.emitStatus();
        return false;
      }

      return true; // No new status (order still on going?), continue the process loop
    }
    else {
      // Timeout while checking, maybe the bridge takes too long or is stuck.
      this.emitStatus(GlobalTranslationService.instance.translateInstant('easybridge.bridging-takes-too-long'));

      return false;
    }
  }

  private async executeCompletion(): Promise<void> {
    this.currentStep = TransferStep.COMPLETED;
    await this.save();
    this.emitStatus();
  }

  private emitStatus(error?: string) {
    let canContinue: boolean;
    let canDismiss: boolean;

    switch (this.currentStep) {
      case TransferStep.NEW:
        canContinue = true; canDismiss = false;
        break;
      case TransferStep.PUBLISHED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.REJECTED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.COMPLETED:
        canContinue = true; canDismiss = false;
        break;
      default:
        throw new Error(`emitStatus(): Unhandled step ${this.currentStep}`);
    }

    this.status.next({
      step: this.currentStep,
      canContinue,
      canDismiss,
      lastError: error
    });
  }

  public getTransferProgressIndex(): number {
    switch (this.currentStep) {
      case TransferStep.NEW:
        return 0;
      case TransferStep.PUBLISHING:
        return 1;
      case TransferStep.PUBLISHED:
        return 2;
      case TransferStep.REJECTED: // TODO
        return 3;
      case TransferStep.COMPLETED:
        return 4;
      default:
        throw new Error(`getTransferProgressIndex(): Unhandled step ${this.currentStep}`);
    }
  }

  public getTotalNumberOfSteps(): number {
    return 5;
  }

  public getTransferProgressMessage(): string {
    switch (this.currentStep) {
      case TransferStep.NEW:
        return GlobalTranslationService.instance.translateInstant('multiswap.step-not-started');
      case TransferStep.PUBLISHING:
        return GlobalTranslationService.instance.translateInstant('multiswap.step-publishing');
      case TransferStep.PUBLISHED:
        return GlobalTranslationService.instance.translateInstant('multiswap.step-published');
      case TransferStep.REJECTED:
        return GlobalTranslationService.instance.translateInstant('multiswap.step-failed');
      case TransferStep.COMPLETED:
        return GlobalTranslationService.instance.translateInstant('multiswap.step-received');
      default:
        throw new Error(`getTransferProgressMessage(): Unhandled step ${this.currentStep}`);
    }
  }

  /**
   * Checks if the master password has been prompted (and got) during this transfer session.
   * If not, we force getting it before continuing, because further bridge and operations do not ask for it to automatize
   * the operations. But we need to request it at least once for security reason.
   *
   * Returns true if the operations can continue (got password, now or earlier).
   */
  private async checkUnlockMasterPassword(): Promise<boolean> {
    if (!this.promptPayPassword)
      return true; // Already got before, all right

    let password = await AuthService.instance.getWalletPassword(this.masterWalletId, true, true);
    if (password) {
      this.promptPayPassword = false;
      return true;
    }
    else {
      this.emitStatus(GlobalTranslationService.instance.translateInstant('easybridge.error-no-authorization'));
      return false;
    }
  }

  public getWalletAddress(): string {
    return this.sourceNetworkSubWallet.getAccountAddress(AddressUsage.EVM_CALL);
  }

  public hasUserAgreement(): boolean {
    return this.userAgreed;
  }

  public approveUserAgreement() {
    this.userAgreed = true;
    void this.save();
  }
}