import { TradeType } from "@uniswap/sdk-core";
import BigNumber from "bignumber.js";
import { BehaviorSubject } from "rxjs";
import { Logger } from "src/app/logger";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { Trade } from "src/app/thirdparty/custom-uniswap-v2-sdk/src";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EVMNetworkWallet } from "src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { EasyBridgeService } from "../services/easybridge.service";
import { UniswapService } from "../services/uniswap.service";
import { BridgeableToken } from "./bridgeabletoken";

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
  transactionPublishDate?: number; // Timestamp at which the transaction got published
  transactionHash?: string; // Bridge contract transaction hash on the source chain
  destinationBlockBefore?: number; // Block at which the destination chain was just before calling the bridge

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

  // Computed
  private mainCoinSubWallet: AnyMainCoinEVMSubWallet = null;

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

    transfer.emitStatus(); // Emit an initial status right after the initial setup

    return transfer;
  }

  public static async prepareNewTransfer(masterWalletId: string, sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): Promise<Transfer> {
    let transfer = new Transfer();

    await transfer.compute(masterWalletId, sourceToken, destinationToken, amount);
    await transfer.save();

    transfer.emitStatus(); // Emit an initial status right after the initial setup

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
      estimatedReceivedAmount: this.estimatedReceivedAmount
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

    await this.updateComputations();
  }

  /**
   * Differential computation: refreshes only part of the computation (eg: most recent swap values) but without any change on the
   * input values passed to compute().
   */
  private async updateComputations(): Promise<void> {
    Logger.log("easybridge", "Computing transfer information", this.masterWalletId, this.sourceToken, this.destinationToken, this.amount);

    let sourceMasterWallet = WalletService.instance.getMasterWallet(this.masterWalletId);
    let sourceNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.sourceToken.chainId);

    // Get a network wallet for the target source chain - don't launch its background services
    let sourceNetworkWallet = await sourceNetwork.createNetworkWallet(sourceMasterWallet, false);
    console.log("Source network wallet:", sourceNetworkWallet);
    if (!(sourceNetworkWallet instanceof EVMNetworkWallet))
      throw new Error("Easy bridge service can only be used with EVM networks");

    this.mainCoinSubWallet = sourceNetworkWallet.getMainEvmSubWallet();

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
        bridgeFeesAmount
      };
    }

    // If the bridge destination token is not the final destination token, then this normally means we need to swap.
    // TODO: (but let's check this feasibility)
    if (this.destinationToken != this.bridgeStep.destinationToken) {
      let swapNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.bridgeStep.destinationToken.chainId);

      let currencyProvider = swapNetwork.getUniswapCurrencyProvider();
      if (!currencyProvider)
        throw new Error('Transfer compute(): No currency provider found');

      //let sourceCoin = new ERC20Coin("test", "test", sourceToken.address, sourceToken.decimals, MAINNET_TEMPLATE, true, false);
      //let destCoin = new ERC20Coin("test2", "test2", destinationToken.address, destinationToken.decimals, MAINNET_TEMPLATE, true, false);
      let trade = await UniswapService.instance.computeSwap(swapNetwork, this.bridgeStep.destinationToken, new BigNumber(this.amount), this.destinationToken);

      // Swap fees: usually something like 0.25% * number of hops in the trade
      let swapFees = currencyProvider.getSwapFees() * trade.route.pairs.length;

      this.swapStep = {
        from: this.bridgeStep.destinationToken,
        to: this.destinationToken,
        trade,
        swapFees
      };
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
   * The onTransferUpdated callback is called every time a significant step is completed and the transfer
   * object (this) is updated (transaction sent), api confirmed, etc.
   */
  public async execute(): Promise<void> {
    let autoProcessNextStep = true;
    while (autoProcessNextStep) {
      switch (this.currentStep) {
        case TransferStep.NEW:
        case TransferStep.BRIDGE_TX_REJECTED:
          autoProcessNextStep = await this.executeBridge(this.mainCoinSubWallet);
          break;
        case TransferStep.BRIDGE_TX_PUBLISHED:
          autoProcessNextStep = await this.awaitBridgedTokensAtDestination(this.mainCoinSubWallet);
          break;
        case TransferStep.BRIDGE_TOKEN_RECEIVED:
          //if (this.swapStep)
          //autoProcessNextStep = await this.executeSwap(this.mainCoinSubWallet);
          break;
        default:
          throw new Error(`Unknown step ${this.currentStep}`);
      }
    }

    // TODO: Faucet
  }

  private async executeBridge(mainCoinSubWallet: AnyMainCoinEVMSubWallet): Promise<boolean> {
    // Execute the bridge
    Logger.log("easybridge", "Executing the bridge");

    this.currentStep = TransferStep.BRIDGE_TX_PUBLISHING;
    // Don't save
    this.emitStatus();

    let result = await EasyBridgeService.instance.executeBridge(this.mainCoinSubWallet, this.sourceToken, this.destinationToken, new BigNumber(this.amount));
    if (!result || !result.txId) {
      Logger.log("easybridge", "Bridge transaction could not be sent.");

      this.currentStep = TransferStep.NEW;
      await this.save();

      this.emitStatus();

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
  private async awaitBridgedTokensAtDestination(mainCoinSubWallet: AnyMainCoinEVMSubWallet): Promise<boolean> {
    let destinationNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(this.destinationToken.chainId);

    await EasyBridgeService.instance.detectExchangeFinished(this.mainCoinSubWallet, this.sourceToken, this.destinationToken, this.bridgeStep.destinationBlockBefore);
    return false;
  }

  private async executeSwap() {
    Logger.log("easybridge", "Recomputing swap data just before swapping");
    await this.updateComputations();

    Logger.log("easybridge", "Executing the swap");
    await UniswapService.instance.executeSwapTrade(this.mainCoinSubWallet, this.swapStep.trade);
    Logger.log("easybridge", "Swap complete");
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
      case TransferStep.BRIDGE_TX_REJECTED:
        return 3;
      case TransferStep.BRIDGE_TOKEN_RECEIVED:
        return 4;
      case TransferStep.FAUCET_API_CALLED:
        return 5;
      case TransferStep.SWAP_TX_PUBLISHED:
        return 6;
      case TransferStep.SWAP_TX_REJECTED:
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
        return "Awaiting cross chain result. This can take a few second to several minutes";
      case TransferStep.BRIDGE_TX_REJECTED:
        return "Cross chain failed";
      case TransferStep.BRIDGE_TOKEN_RECEIVED:
        return "Tokens arrived on ESC";
      case TransferStep.FAUCET_API_CALLED:
        return "TODO";
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
}