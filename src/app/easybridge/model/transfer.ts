import { TradeType } from "@uniswap/sdk-core";
import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import { Trade } from "src/app/thirdparty/custom-uniswap-v2-sdk/src";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { EasyBridgeService } from "../services/easybridge.service";
import { UniswapService } from "../services/uniswap.service";
import { BridgeableToken } from "./bridgeabletoken";

type BridgeStep = {
  // Config
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;

  // State
  transactionPublishDate?: number; // Timestamp at which the transaction got published
  transactionHash?: string; // Bridge contract transaction hash on the source chain

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
  walletAddress: string; // EVM wallet address of the user
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;
  amount: number;

  // Computed steps
  bridgeStep: BridgeStep;
  faucetStep: FaucetStep;
  swapStep: SwapStep;
  estimatedReceivedAmount: BigNumber; // Number of destination tokens received after all operations are completed, and after deduction of all fees and commissions
}

/**
 * Object representing a bridge transfer overall including the required steps list, current steps, fees involved,
 * destination token estimations, etc
 */
export class Transfer implements SerializedTransfer {
  walletAddress: string;
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;
  amount: number;
  bridgeStep: BridgeStep;
  faucetStep: FaucetStep;
  swapStep: SwapStep;
  estimatedReceivedAmount: BigNumber;

  constructor() {
  }

  public async compute(walletAddress: string, sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): Promise<void> {
    Logger.log("easybridge", "Computing transfer information", walletAddress, sourceToken, destinationToken, amount);

    // Compute bridge destination token.
    let sourceTokenPeer = EasyBridgeService.instance.getPeerTokenOnOtherChain(sourceToken, destinationToken.chainId);
    let bridgeDestinationToken: BridgeableToken;
    if (sourceTokenPeer == destinationToken) {
      // Bridged peer token is already the destination token - no swap needed
      bridgeDestinationToken = destinationToken;
    }
    else {
      // The token we get after bridging is not the destination token - so we will need a swap on glide
      // TODO: check swapable, and if not, throw computation exception - can't do this global transfer
      bridgeDestinationToken = sourceTokenPeer;
    }

    const { feePercent: bridgeFees, feeAmount: bridgeFeesAmount } = this.computeBridgeFees(sourceToken, destinationToken, amount);

    let bridgeStep: BridgeStep = {
      sourceToken: sourceToken, // Global transfer source token is the bridge source token
      destinationToken: bridgeDestinationToken, // token received after bridge. Could be the final destination token or something intermediate
      bridgeFees,
      bridgeFeesAmount
    };

    let faucetStep: FaucetStep = null; // TODO

    let swapStep: SwapStep = null;
    // If the bridge destination token is not the final destination token, then this normally means we need to swap.
    // TODO: (but let's check this feasibility)
    if (destinationToken != bridgeDestinationToken) {
      let swapNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(bridgeDestinationToken.chainId);

      let currencyProvider = swapNetwork.getUniswapCurrencyProvider();
      if (!currencyProvider)
        throw new Error('Transfer compute(): No currency provider found');

      //let sourceCoin = new ERC20Coin("test", "test", sourceToken.address, sourceToken.decimals, MAINNET_TEMPLATE, true, false);
      //let destCoin = new ERC20Coin("test2", "test2", destinationToken.address, destinationToken.decimals, MAINNET_TEMPLATE, true, false);
      let trade = await UniswapService.instance.computeSwap(swapNetwork, bridgeDestinationToken, new BigNumber(amount), destinationToken);

      // Swap fees: usually something like 0.25% * number of hops in the trade
      let swapFees = currencyProvider.getSwapFees() * trade.route.pairs.length;

      swapStep = {
        from: bridgeDestinationToken,
        to: destinationToken,
        trade,
        swapFees
      };
    }

    // Compute the final received amount estimation
    let estimatedReceivedAmount: BigNumber;
    if (swapStep) {
      // Swap involved. Use the trade object
      estimatedReceivedAmount = new BigNumber(swapStep.trade.outputAmount.toFixed());

      // Approximative: Deduce swap fees
      estimatedReceivedAmount = estimatedReceivedAmount.minus(estimatedReceivedAmount.multipliedBy(swapStep.swapFees).dividedBy(100));
    }
    else {
      // No swap involved. Received amount is bridged amount minus bridge fees
      estimatedReceivedAmount = new BigNumber(amount).minus(bridgeStep.bridgeFeesAmount);
    }

    // Store computation result into ourself
    Object.assign(this, {
      walletAddress,
      sourceToken,
      destinationToken,
      amount,
      bridgeStep,
      faucetStep,
      swapStep,
      estimatedReceivedAmount
    });
  }

  private computeBridgeFees(sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: number): { feePercent: number, feeAmount: BigNumber } {
    let feePercent = sourceToken.fee || 0;
    return {
      feePercent: feePercent,
      feeAmount: new BigNumber(amount).multipliedBy(feePercent)
    };
  }

  /**
   * Executes all the transfer steps: bridge, faucet and swap.
   * The onTransferUpdated callback is called every time a significant step is completed and the transfer
   * object (this) is updated (transaction sent), api confirmed, etc.
   */
  public async execute(mainCoinSubWallet: AnyMainCoinEVMSubWallet, onTransferUpdated: (transfer: Transfer) => void): Promise<void> {
    // Execute the bridge
    Logger.log("easybridge", "Executing the bridge");
    await EasyBridgeService.instance.bridgeTokensTest();

    // TODO: Faucet

    // Execute the swap, if any
    if (this.swapStep) {
      Logger.log("easybridge", "Executing the swap");
      await UniswapService.instance.executeSwapTrade(mainCoinSubWallet, this.swapStep.trade, this.walletAddress, this.walletAddress);
    }
  }
}