import { TradeType } from "@uniswap/sdk-core";
import BigNumber from "bignumber.js";
import { BehaviorSubject } from "rxjs";
import { sleep } from "src/app/helpers/sleep.helper";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { Trade } from "src/app/thirdparty/custom-uniswap-v2-sdk/src";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EVMNetworkWallet } from "src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { AuthService } from "src/app/wallet/services/auth.service";
import { ERC20CoinService } from "src/app/wallet/services/evm/erc20coin.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { EasyBridgeService } from "../services/easybridge.service";
import { UniswapService } from "../services/uniswap.service";
import { BridgeableToken, equalTokens } from "./bridgeabletoken";

const MAX_PRICE_IMPACT_PERCENT = 5;

export enum TransferStep {
  NEW = "new",
  BRIDGE_TX_PUBLISHING = "bridge_tx_publishing",
  BRIDGE_TX_PUBLISHED = "bridge_tx_published",
  BRIDGE_TX_REJECTED = "bridge_tx_rejected",
  BRIDGE_TOKEN_RECEIVED = "bridge_token_received",
  FAUCET_API_CALLED = "faucet_api_called",
  SWAP_TX_PUBLISHING = "swap_tx_publishing",
  SWAP_TX_PUBLISHED = "swap_tx_published",
  SWAP_TX_REJECTED = "swap_tx_rejected",
  SWAP_TOKEN_RECEIVED = "swap_token_received",
  COMPLETED = "completed"
}

type TransferStatus = {
  step: TransferStep;
  lastError?: string;
  canContinue: boolean;
  canDismiss: boolean;
}

type BridgeStep = {
  // Config
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;

  // State
  minTx: number; // Min amount to be transferred (human readable format) from the source network
  //transactionPublishDate?: number; // Timestamp at which the transaction got published
  transactionHash?: string; // Bridge contract transaction hash on the source chain
  destinationBlockBefore?: number; // Block at which the destination chain was just before calling the bridge
  receivedTokenAmount?: string; // Exact number of tokens really received, in chain format (from chain event values)

  // Computed
  bridgeFees: number; // Bridge fees in percentage of the transaction
  bridgeFeesAmount: BigNumber; // Bridge fees in source token amount, human readable format
}

type FaucetStep = {
  // Config

  // State
}

type SwapStep = {
  // Config
  from: BridgeableToken;
  to: BridgeableToken;

  // State
  transactionHash?: string; // Swap contract transaction hash on the destination chain

  // Computed
  swapFees: number; // Total swap fees in percentage of the input amount.
  trade: Trade<any, any, TradeType.EXACT_INPUT>;
}

/**
 * Transfer on disk
 */
type SerializedTransfer = {
  // Config
  masterWalletId: string; // Main reference to the creating wallet, to make sure we always resume operations on this wallet even after restarting
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;
  amount: number;

  // Global state machine
  currentStep: TransferStep;
  userAgreed: boolean;

  // Computed steps
  bridgeStep: BridgeStep;
  faucetStep: FaucetStep;
  swapStep: SwapStep;
  estimatedReceivedAmount: BigNumber; // Number of destination tokens received after all operations are completed, and after deduction of all fees and commissions
}

/**
 * Object representing a bridge transfer overall including the required steps list, current steps, fees involved,
 * destination token estimations, etc.
 *
 * List of all steps:
 * New -> Bridge tx published -> Bridged token received -> Faucet api called -> Swap tx published -> Swapped token received
 *
 * The state machine is as following (transferStatus rxjs event) - not fully up to date, just rough idea:
 *
 * if transfer never started:
 *      activeStep: new, canResume: true, canDismiss: false
 * if transfer started and tx not published when trying to bridge:
 *      activeStep: new, lastError: "bridge tx failed", canResume: true, canDismiss: true
 * if bridge tx published, not yet confirmed:
 *      activeStep: bridge_tx_published, canContinue: false, canDismiss: true
 * if bridge tx published, but tx rejected:
 *      activeStep: new, lastError: "bridge tx rejected", canContinue: true, canDismiss: true
 * if bridge received at destination, swap not published yet:
 *      activeStep: bridged_token_received, canContinue: true, canDismiss: true
 * if step = bridged_token_received, call faucet:
 *      activeStep: faucet_called, canContinue: true, canDismiss: true
 * if bridge received at destination, swap published, swap not confirmed yet:
 *      activeStep: swap_tx_published, canContinue: false, canDismiss: true
 * if swap tx rejected:
 *      activeStep: faucet_called, canContinue: true, canDismiss: true
 * if swap token received:
 *      activeStep: swapped_token_received, canContinue: false, canDismiss: true, isCompleted: xxx
 */
export class Transfer implements SerializedTransfer {
  masterWalletId: string;
  sourceToken: BridgeableToken = null;
  destinationToken: BridgeableToken = null
  amount: number = null;
  currentStep: TransferStep = TransferStep.NEW;
  bridgeStep: BridgeStep = null;
  faucetStep: FaucetStep = null;
  swapStep: SwapStep = null;
  estimatedReceivedAmount: BigNumber = null;
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

  protected constructor() { }

  /**
   * Loads the on going transfer from persistence if there is one.
   */
  public static async loadExistingTransfer(): Promise<Transfer> {
    let serializedTransfer = await GlobalStorageService.instance.getSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString, "easybridge", "activetransfer", null);
    if (!serializedTransfer)
      return null;

    let transfer = new Transfer();
    Object.assign(transfer, serializedTransfer);

    await transfer.updateComputations();

    return transfer;
  }

  public static async prepareNewTransfer(masterWalletId: string, sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): Promise<Transfer> {
    let transfer = new Transfer();

    await transfer.compute(masterWalletId, sourceToken, destinationToken, amount);
    await transfer.save();

    return transfer;
  }

  /**
   * Save current transfer to disk to be able to resume later
   */
  private save(): Promise<void> {
    let serializedTransfer: SerializedTransfer = {
      masterWalletId: this.masterWalletId,
      sourceToken: this.sourceToken,
      destinationToken: this.destinationToken,
      amount: this.amount,
      currentStep: this.currentStep,
      bridgeStep: this.bridgeStep,
      faucetStep: this.faucetStep,
      swapStep: this.swapStep,
      estimatedReceivedAmount: this.estimatedReceivedAmount,
      userAgreed: this.userAgreed
    };

    return GlobalStorageService.instance.setSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString, "easybridge", "activetransfer", serializedTransfer);
  }

  public reset() {
    return GlobalStorageService.instance.deleteSetting(GlobalDIDSessionsService.instance.getSignedInIdentity().didString, "easybridge", "activetransfer");
  }

  /**
   * Initial computation
   */
  private async compute(masterWalletId: string, sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): Promise<void> {
    this.masterWalletId = masterWalletId;
    this.sourceToken = sourceToken;
    this.destinationToken = destinationToken;
    this.amount = amount;
    this.bridgeStep = null;
    this.faucetStep = null;
    this.swapStep = null;
    this.estimatedReceivedAmount = null;
    this.canExecute = false;

    await this.updateComputations();
  }

  /**
   * Differential computation: refreshes only part of the computation (eg: most recent swap values) but without any change on the
   * input values passed to compute().
   */
  private async updateComputations(): Promise<void> {
    Logger.log("easybridge", "Computing transfer information", this.masterWalletId, this.sourceToken, this.destinationToken, this.amount);

    // Unless said otherwise below, we may be able to execute the transfer.
    this.canExecute = true;
    this.cannotExecuteReason = "Unknown reason";

    let masterWallet = WalletService.instance.getMasterWallet(this.masterWalletId);
    let sourceNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.sourceToken.chainId);

    let destinationNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.destinationToken.chainId);

    // Get a network wallet for the target source chain - don't launch its background services
    let sourceNetworkWallet = await sourceNetwork.createNetworkWallet(masterWallet, false);
    if (!(sourceNetworkWallet instanceof EVMNetworkWallet))
      throw new Error("Easy bridge service can only be used with EVM networks");

    // Get a network wallet for the target source chain - don't launch its background services
    let destinationNetworkWallet = await destinationNetwork.createNetworkWallet(masterWallet, false);
    if (!(destinationNetworkWallet instanceof EVMNetworkWallet))
      throw new Error("Easy bridge service can only be used with EVM networks");

    this.sourceNetworkSubWallet = sourceNetworkWallet.getMainEvmSubWallet();
    this.destinationNetworkSubWallet = destinationNetworkWallet.getMainEvmSubWallet();

    // Compute bridge destination token, if not already known
    if (!this.bridgeStep) {
      let sourceTokenPeer = EasyBridgeService.instance.getPeerTokenOnOtherChain(this.sourceToken, this.destinationToken.chainId);
      let bridgeDestinationToken: BridgeableToken;
      if (sourceTokenPeer == this.destinationToken) {
        // Bridged peer token is already the destination token - no swap needed
        bridgeDestinationToken = this.destinationToken;
      }
      else {
        // The token we get after bridging is not the destination token - so we will need a swap on glide
        // TODO: check swapable, and if not, throw computation exception - can't do this global transfer
        bridgeDestinationToken = sourceTokenPeer;
      }

      const { feePercent: bridgeFees, feeAmount: bridgeFeesAmount } = this.computeBridgeFees(this.sourceToken, this.destinationToken, this.amount);

      this.bridgeStep = {
        sourceToken: this.sourceToken, // Global transfer source token is the bridge source token
        destinationToken: bridgeDestinationToken, // token received after bridge. Could be the final destination token or something intermediate
        bridgeFees,
        bridgeFeesAmount,
        minTx: (await EasyBridgeService.instance.getMinTx(this.sourceToken, bridgeDestinationToken)).toNumber()
      };
    }

    // If the bridge destination token is not the final destination token, then this normally means we need to swap.
    // TODO: (but let's check this feasibility)
    if (!equalTokens(this.destinationToken, this.bridgeStep.destinationToken)) {
      let swapNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.bridgeStep.destinationToken.chainId);

      let currencyProvider = swapNetwork.getUniswapCurrencyProvider();
      if (!currencyProvider)
        throw new Error('Transfer compute(): No currency provider found');

      // Choose the right swap amount as swap input. If no bridge has been done yet, we use the global transfer amount as simulated
      // input amount for the swap. Buf if we got an exact bridged amount from a bridge event, we use this value for the swap.
      // We cannot use the global input amount for the real swap as user may not have enough tokens, as the bridged amount got
      // some bridge fees deduced and the received amount is lower.
      let swapInputAmount: BigNumber; // Human readable
      if (this.bridgeStep.receivedTokenAmount) {
        swapInputAmount = ERC20CoinService.instance.toHumanReadableAmount(this.bridgeStep.receivedTokenAmount, this.bridgeStep.destinationToken.decimals);
        Logger.log("easybridge", "Using exact received bridge amount to compute swap", swapInputAmount.toString(10));
      }
      else {
        swapInputAmount = new BigNumber(this.amount);
        Logger.log("easybridge", "Using global transfer input amount to compute swap", swapInputAmount.toString(10));
      }

      let trade = await UniswapService.instance.computeSwap(swapNetwork, this.bridgeStep.destinationToken, swapInputAmount, this.destinationToken);
      if (trade) {
        // Make sure the slippage is not too high
        let tradeImpactDecimal = parseFloat(trade.priceImpact.toSignificant(2));

        // Swap fees: usually something like 0.25% * number of hops in the trade
        let swapFees = currencyProvider.getSwapFees() * trade.route.pairs.length;

        this.swapStep = {
          from: this.bridgeStep.destinationToken,
          to: this.destinationToken,
          trade,
          swapFees,
        };

        if (tradeImpactDecimal > MAX_PRICE_IMPACT_PERCENT) {
          this.canExecute = false;
          this.cannotExecuteReason = "Swap cannot be executed, slippage is too high. Possibly not enough liquidity on the DEX.";
        }
      }
      else {
        // No available trade
        this.canExecute = false;
        this.cannotExecuteReason = "Failed to find a good swap trade. Possibly not enough liquidity on the DEX.";
      }
    }

    // Compute the final received amount estimation
    if (this.swapStep) {
      // Swap involved. Use the trade object
      this.estimatedReceivedAmount = new BigNumber(this.swapStep.trade.outputAmount.toFixed());

      // Approximative: Deduce swap fees
      this.estimatedReceivedAmount = this.estimatedReceivedAmount.minus(this.estimatedReceivedAmount.multipliedBy(this.swapStep.swapFees).dividedBy(100));
    }
    else {
      // No swap involved. Received amount is bridged amount minus bridge fees
      this.estimatedReceivedAmount = new BigNumber(this.amount).minus(this.bridgeStep.bridgeFeesAmount);
    }

    this.emitPostComputationStatus();
  }

  private emitPostComputationStatus() {
    if (this.canExecute) {
      this.emitStatus(); // Emit an initial status right after the initial setup
    }
    else {
      this.emitStatus(this.cannotExecuteReason);
    }
  }

  private computeBridgeFees(sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): { feePercent: number, feeAmount: BigNumber } {
    let feePercent = sourceToken.fee || 0;
    return {
      feePercent: feePercent,
      feeAmount: new BigNumber(amount).multipliedBy(feePercent)
    };
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
        case TransferStep.BRIDGE_TX_REJECTED:
          // First step
          if (!await this.checkUnlockMasterPassword())
            autoProcessNextStep = false;
          else
            autoProcessNextStep = await this.executeBridge();
          break;
        case TransferStep.BRIDGE_TX_PUBLISHED:
          // Bridge called, now wait for the tokens to be received on the destination chain
          autoProcessNextStep = await this.awaitBridgedTokensAtDestination();
          break;
        case TransferStep.BRIDGE_TOKEN_RECEIVED:
          // Token received, call the faucet
          autoProcessNextStep = await this.callFaucet();
          break;
        case TransferStep.FAUCET_API_CALLED:
          // Faucet called, check if there is a swap to do
          if (this.swapStep) {
            if (!await this.checkUnlockMasterPassword())
              autoProcessNextStep = false;
            else
              autoProcessNextStep = await this.executeSwap();
          }
          else {
            await this.executeCompletion();
            autoProcessNextStep = false; // loop end
          }
          break;
        case TransferStep.SWAP_TX_PUBLISHED:
          await this.executeCompletion();
          autoProcessNextStep = false; // loop end
          break;
        default:
          throw new Error(`Unknown step ${this.currentStep}`);
      }

      await sleep(500);
    }
  }

  private async executeBridge(): Promise<boolean> {
    // Execute the bridge
    Logger.log("easybridge", "Executing the bridge");

    this.currentStep = TransferStep.BRIDGE_TX_PUBLISHING;
    // Don't save
    this.emitStatus();

    let result = await EasyBridgeService.instance.executeBridge(this.sourceNetworkSubWallet, this.sourceToken, this.destinationToken, new BigNumber(this.amount));
    if (!result || !result.txId) {
      Logger.log("easybridge", "Bridge transaction could not be sent.");

      this.currentStep = TransferStep.NEW;
      await this.save();

      this.emitStatus("Bridge request could not be sent, please try again.");

      return false;
    }
    else {
      Logger.log("easybridge", "Bridge request published");

      this.currentStep = TransferStep.BRIDGE_TX_PUBLISHED;
      this.bridgeStep.transactionHash = result.txId;
      this.bridgeStep.destinationBlockBefore = result.destinationBlockBefore;
      await this.save();

      this.emitStatus();

      return true;
    }
  }

  /**
   * Awaits until the bridged tokens are found on the destination chain
   */
  private async awaitBridgedTokensAtDestination(): Promise<boolean> {
    const chainAmoundReceived = await EasyBridgeService.instance.detectExchangeFinished(this.sourceNetworkSubWallet, this.sourceToken, this.destinationToken, this.bridgeStep.destinationBlockBefore);
    if (chainAmoundReceived) {
      // Bridged tokens have been received on destination chain

      this.currentStep = TransferStep.BRIDGE_TOKEN_RECEIVED;
      this.bridgeStep.receivedTokenAmount = chainAmoundReceived;
      await this.save();
      this.emitStatus();

      return true;
    }
    else {
      // Timeout while checking, maybe the bridge takes too long or is stuck.
      this.emitStatus("Bridging tokens between chains seems to take more time than expected. Please come back later to check again and continue.");

      return false;
    }
  }

  private async callFaucet(): Promise<boolean> {
    const result = await EasyBridgeService.instance.callBridgeFaucet(this.sourceNetworkSubWallet, this.bridgeStep.transactionHash, this.sourceToken);

    this.currentStep = TransferStep.FAUCET_API_CALLED;
    await this.save();
    this.emitStatus();

    return true; // No matter what the real faucet result is, let's continue, not blocking.
  }

  private async executeSwap(): Promise<boolean> {
    Logger.log("easybridge", "Recomputing swap data just before swapping");
    await this.updateComputations();

    Logger.log("easybridge", "Executing the swap");
    let txId: string;
    try {
      txId = await UniswapService.instance.executeSwapTrade(this.destinationNetworkSubWallet, this.swapStep.from, this.swapStep.trade);
      if (txId) {
        Logger.log("easybridge", "Swap complete");

        this.currentStep = TransferStep.SWAP_TX_PUBLISHED;
        this.swapStep.transactionHash = txId;
        await this.save();
        this.emitStatus();

        return true;
      }
    }
    catch (e) {
      // Gas estimation error, network error...
      Logger.log("easybridge", "executeSwapTrade() error:", e);
      // Fallthrough
    }

    if (!txId) {
      Logger.log("easybridge", "Swap failed");

      this.emitStatus("Swap failed to execute, this could be a network or blockchain error, please try again.");

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
      case TransferStep.BRIDGE_TX_PUBLISHING:
        canContinue = false; canDismiss = false;
        break;
      case TransferStep.BRIDGE_TX_PUBLISHED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.BRIDGE_TX_REJECTED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.BRIDGE_TOKEN_RECEIVED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.FAUCET_API_CALLED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.SWAP_TX_PUBLISHED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.SWAP_TX_REJECTED:
        canContinue = true; canDismiss = true;
        break;
      case TransferStep.SWAP_TOKEN_RECEIVED:
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
      case TransferStep.BRIDGE_TX_PUBLISHING:
        return 1;
      case TransferStep.BRIDGE_TX_PUBLISHED:
        return 2;
      case TransferStep.BRIDGE_TX_REJECTED: // TODO
        return 3;
      case TransferStep.BRIDGE_TOKEN_RECEIVED:
        return 4;
      case TransferStep.FAUCET_API_CALLED:
        return 5;
      case TransferStep.SWAP_TX_PUBLISHED:
        return 6;
      case TransferStep.SWAP_TX_REJECTED: // TODO
        return 7;
      case TransferStep.SWAP_TOKEN_RECEIVED:
        return 8;
      case TransferStep.COMPLETED:
        return 9;
      default:
        throw new Error(`getTransferProgressIndex(): Unhandled step ${this.currentStep}`);
    }
  }

  public getTotalNumberOfSteps(): number {
    return 10;
  }

  public getTransferProgressMessage(): string {
    switch (this.currentStep) {
      case TransferStep.NEW:
        return "Not started";
      case TransferStep.BRIDGE_TX_PUBLISHING:
        return "Requesting to cross chains";
      case TransferStep.BRIDGE_TX_PUBLISHED:
        return "Awaiting cross chain result. This can take a few seconds to several minutes";
      case TransferStep.BRIDGE_TX_REJECTED:
        return "Cross chain failed";
      case TransferStep.BRIDGE_TOKEN_RECEIVED:
        return "Tokens arrived on ESC. Calling faucet to get a few ELA for gas.";
      case TransferStep.FAUCET_API_CALLED:
        let msg = "Faucet was called to receive a few native coins for gas.";
        if (this.swapStep)
          msg += " Now swapping tokens.";
        return msg;
      case TransferStep.SWAP_TX_PUBLISHED:
        return "Exchanging tokens on ESC";
      case TransferStep.SWAP_TX_REJECTED:
        return "Tokens exchange failed on ESC";
      case TransferStep.SWAP_TOKEN_RECEIVED:
        return "Tokens exchange completed on ESC";
      case TransferStep.COMPLETED:
        return "Completed";
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
      this.emitStatus("No authorization, cancelled.");
      return false;
    }
  }

  public getWalletAddress(): Promise<string> {
    return this.sourceNetworkSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
  }

  public hasUserAgreement(): boolean {
    return this.userAgreed;
  }

  public approveUserAgreement() {
    this.userAgreed = true;
    void this.save();
  }
}