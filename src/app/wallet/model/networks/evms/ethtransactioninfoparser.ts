import { utils } from "ethers";
import { Logger } from "src/app/logger";
import { GlobalEthereumRPCService } from "src/app/services/global.ethereum.service";
import type { TransactionReceipt } from "web3-core";
import { ERC20CoinInfo, ERC20CoinService } from "../../../services/evm/erc20coin.service";
import type { AnyNetwork } from "../network";
import { EthTransaction } from "./evm.types";

export enum ETHOperationType {
  ERC20_TOKEN_APPROVE = "erc20_token_approve", // The contract seems to be a request to approve a caller to spend ERC20 tokens on behalf of the user
  // TODO: ERC721 and ERC1155 approve methods
  OTHER_CONTRACT_CALL = "other_contract_call", // Generic / undetected transaction type
  NOT_A_CONTRACT_CALL = "not_a_contract_call" // Standard transfer, no contract data payload
}

export type EthContractOperation = {
  //opSignature4Bytes: string; // Event or method operation signature. Extracted from receipt topics. eg: 0xddf252ad for Transfer(address,address,uint256)
  description: string; // Operation description, human readable, not yet translated. Eg: wallet.ext-info-approve --> Send 218.56 ELK, Approve third party to spend USDC
  descriptionTranslationParams?: any; // Object containing parameters passed to the translation module along with the description key
}

export type ApproveERC20Operation = EthContractOperation & {
  tokenName: string;
  symbol: string;
}

export type EthContractEvent = {
  description: string; // Event description, human readable, already translated. Eg: Sent 218.56 ELK, Approved third party to spend my USDC
}

export type ETHTransactionInfo = {
  type: ETHOperationType; // Main transaction type based on the entry method calls in a contract.
  operation: EthContractOperation; // Main operation / method called in the contract
  events: EthContractEvent[];
}

export type ETHTransactionTokenApproveInfo = ETHTransactionInfo & {
  tokenName: string;
  symbol: string;
}

/**
 * Utility to extract various information such as a called method name, from a received web3 transaction
 * data (ex: 0x.......).
 */
export class ETHTransactionInfoParser {
  constructor(private network: AnyNetwork) { }

  /**
   * @param txData Transaction data (0x...)
   * @param txTo contract call destination address
   */
  public async computeFromTxData(txData: string, txTo: string): Promise<ETHTransactionInfo> {
    if (!txData || !txData.startsWith("0x")) {
      throw new Error("ETHTransactionInfoParser can be created only with a valid transaction data string starting with 0x");
    }

    let txInfo = this.createEmptyTransactionInfo();
    await this.computeOperation(txInfo, txData, txTo);
    return txInfo;
  }

  /**
   * @param receipt Published transaction receipt
   * @param txData Publish transaction input data (when contract was called)
   */
  public async computeFromTxReceipt(receipt: TransactionReceipt, txData: string): Promise<ETHTransactionInfo> {
    if (!txData || !txData.startsWith("0x")) {
      // Some transaction providers such as covalent don't provide the 'input'. So we try here to fetch that from the get transaction by hash API
      try {
        let ethTransaction = <EthTransaction>await GlobalEthereumRPCService.instance.eth_getTransactionByHash(this.network.getRPCUrl(), receipt.transactionHash);
        if (ethTransaction)
          txData = ethTransaction.input;
      }
      catch (e) {
        // Silent catch
      }

      if (!txData || !txData.startsWith("0x")) {
        throw new Error("ETHTransactionInfoParser can be created only with a valid transaction data string starting with 0x");
      }
    }

    let txInfo = this.createEmptyTransactionInfo();
    await this.computeOperation(txInfo, txData, receipt.to);
    // UNUSED FOR NOW - TOO MUCH INFO IN EVENTS - NEED SOME TIME TO MAKE THIS CLEANLY - UNCOMMENT TO SEE THIS APPEAR ON COIN HOME
    // await this.computeEvents(txInfo, receipt);
    return txInfo;
  }

  private async computeOperation(txInfo: ETHTransactionInfo, txData: string, txTo?: string): Promise<void> {
    txInfo.type = ETHOperationType.OTHER_CONTRACT_CALL; // Default, if we don't find/want more specific

    if (txData === "0x") {
      txInfo.type = ETHOperationType.NOT_A_CONTRACT_CALL;
      return;
    }

    let methodAction = txData.substring(0, 10); // 0x + 4 hex bytes
    switch (methodAction) {
      case '0x0febdd49': // ERC1155 safeTransferFrom(address,address,uint256,uint256)
        txInfo.operation = { description: "wallet.ext-tx-info-type-send-erc1155-nft" };
        break;

      case '0x23b872dd': // ERC721 transferFrom(address,address,uint256) - TODO: missing - ERC721 safeTransferFrom
        txInfo.operation = { description: 'wallet.ext-tx-info-type-send-tokens' };
        break;

      case '0xa9059cbb': // transfer(address,uint256)
        let coinInfo = await ERC20CoinService.instance.getCoinInfo(this.network, txTo); // txTo is the contract address
        if (coinInfo)
          txInfo.operation = { description: 'wallet.ext-tx-info-type-send-erc20', descriptionTranslationParams: { symbol: coinInfo.coinSymbol } };
        else
          txInfo.operation = { description: 'wallet.ext-tx-info-type-send-tokens' };
        break;

      case '0x095ea7b3': // approve(address,uint256)
        try {
          // Method is "approve". "to" must be a ERC20 contract and we'll try to resolve the token name.
          let coinInfo = await this.getERC20TokenInfoOrThrow(txTo);
          let operation: ApproveERC20Operation = {
            description: 'wallet.ext-tx-info-type-approve-erc20', descriptionTranslationParams: { symbol: coinInfo.coinSymbol },
            tokenName: coinInfo.coinName,
            symbol: coinInfo.coinSymbol
          }

          txInfo.type = ETHOperationType.ERC20_TOKEN_APPROVE;
          txInfo.operation = operation;
        }
        catch (e) {
          txInfo.type = ETHOperationType.ERC20_TOKEN_APPROVE;

          let operation: ApproveERC20Operation = {
            description: 'wallet.ext-tx-info-type-approve-token',
            tokenName: null,
            symbol: null
          }
          txInfo.operation = operation;
        }
        break;

      case '0x18cbafe5': // swapExactTokensForETH(uint256,uint256,address[],address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function swapExactTokensForETH(uint256,uint256,address[],address,uint256) public returns (bool success)"], txData);
          let tokensPath = this.arrayTransactionParamAt(params, 2, 2);
          let fromTokenAddress = tokensPath[0]; // First entry of tokensPath is the source ERC20 token.
          let fromCoinInfo = await this.getERC20TokenInfoOrThrow(fromTokenAddress);
          txInfo.operation = { description: 'wallet.ext-tx-info-type-swap-erc20', descriptionTranslationParams: { fromSymbol: fromCoinInfo.coinSymbol, toSymbol: this.network.getMainTokenSymbol() } };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-swap-tokens" };
        }
        break;

      case '0x7ff36ab5': // swapExactETHForTokens(uint256,address[],address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function swapExactETHForTokens(uint256,address[],address,uint256) public returns (bool success)"], txData);
          let tokensPath = this.arrayTransactionParamAt(params, 1, 2);
          let toTokenAddress = tokensPath[tokensPath.length - 1]; // Last entry of tokensPath is the destination ERC20 token.
          let toCoinInfo = await this.getERC20TokenInfoOrThrow(toTokenAddress);
          txInfo.operation = { description: 'wallet.ext-tx-info-type-swap-erc20', descriptionTranslationParams: { fromSymbol: this.network.getMainTokenSymbol(), toSymbol: toCoinInfo.coinSymbol } };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-swap-tokens" };
        }
        break;

      case '0x38ed1739': // swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) public returns (bool success)"], txData);
          let tokensPath = this.arrayTransactionParamAt(params, 2, 2);
          let fromTokenAddress = tokensPath[0]; // First entry of tokensPath is the source token.
          let toTokenAddress = tokensPath[tokensPath.length - 1]; // Last entry is the destination token.
          let fromCoinInfo = await this.getERC20TokenInfoOrThrow(fromTokenAddress);
          let toCoinInfo = await this.getERC20TokenInfoOrThrow(toTokenAddress);

          txInfo.operation = { description: 'wallet.ext-tx-info-type-swap-erc20', descriptionTranslationParams: { fromSymbol: fromCoinInfo.coinSymbol, toSymbol: toCoinInfo.coinSymbol } };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-swap-tokens" };
        }
        break;

      case '0xad58bdd1': // relayTokens(address,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function relayTokens(address,address,uint256) public returns (bool success)"], txData);
          let tokenAddress = this.stringTransactionParamAt(params, 0); // From
          let tokenInfo = await this.getERC20TokenInfoOrThrow(tokenAddress);
          txInfo.operation = { description: 'wallet.ext-tx-info-type-bridge-erc20', descriptionTranslationParams: { symbol: tokenInfo.coinSymbol }, };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-bridge-tokens" };
        }
        break;

      case '0xe8e33700': // addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) public returns (bool success)"], txData);
          let tokenAAddress = this.stringTransactionParamAt(params, 0);
          let tokenBAddress = this.stringTransactionParamAt(params, 1);
          let tokenAInfo = await this.getERC20TokenInfoOrThrow(tokenAAddress);
          let tokenBInfo = await this.getERC20TokenInfoOrThrow(tokenBAddress);
          txInfo.operation = { description: 'wallet.ext-tx-info-type-add-liquidity-with-symbols', descriptionTranslationParams: { symbolA: tokenAInfo.coinSymbol, symbolB: tokenBInfo.coinSymbol } };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-liquidity-deposit" };
        }
        break;

      case '0xbaa2abde': // removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) public returns (bool success)"], txData);
          let tokenAAddress = this.stringTransactionParamAt(params, 0);
          let tokenBAddress = this.stringTransactionParamAt(params, 1);
          let tokenAInfo = await this.getERC20TokenInfoOrThrow(tokenAAddress);
          let tokenBInfo = await this.getERC20TokenInfoOrThrow(tokenBAddress);
          txInfo.operation = { description: 'wallet.ext-tx-info-type-remove-liquidity-with-symbols', descriptionTranslationParams: { symbolA: tokenAInfo.coinSymbol, symbolB: tokenBInfo.coinSymbol } };
        }
        catch (e) {
          txInfo.operation = { description: "wallet.ext-tx-info-type-remove-liquidity" };
        }
        break;

      case '0x2195995c': // removeLiquidityWithPermit(address,address,uint256,uint256,uint256,address,uint256,bool,uint8,bytes32,bytes32)
      case '0xded9382a': // removeLiquidityETHWithPermit(address,uint256,uint256,uint256,address,uint256,bool,uint8,bytes32,bytes32)
        txInfo.operation = { description: "wallet.ext-tx-info-type-remove-liquidity" };
        break;

      case '0x2e1a7d4d': // withdraw(uint256)
      case '0xf1d5314a': // withdrawApplication(uint256)
      case '0x441a3e70': // withdraw(uint256,uint256)
        txInfo.operation = { description: "wallet.ext-tx-info-type-withdraw" }; // TODO: refine - withdraw what?
        break;
      case '0x3d18b912': // getReward()
        txInfo.operation = { description: "wallet.ext-tx-info-type-get-rewards" };
        break;
      case '0x2459a699': // getBoosterReward()
        txInfo.operation = { description: "wallet.ext-tx-info-type-get-booster-rewards" };
        break;
      case '0xe2bbb158': // deposit(uint256,uint256)
      case '0xb6b55f25': // deposit(uint256)
        txInfo.operation = { description: "wallet.ext-tx-info-type-deposit" }; // TODO: refine - deposit what?
        break;
      case '0xa694fc3a': // stake(uint256)
      case '0xecd9ba82': // stakeWithPermit(uint256,uint256,uint8,bytes32,bytes32)
        txInfo.operation = { description: "wallet.ext-tx-info-type-stake" }; // TODO: refine - stake what?
        break;
      case '0x1249c58b': // mint()
      case '0xd0def521': // mint(address,string)
        txInfo.operation = { description: "wallet.ext-tx-info-type-mint" };
        break;
      case '0xdb006a75': // redeem(uint256)
        txInfo.operation = { description: "wallet.ext-tx-info-type-redeem" };
        break;
      case '0x60de1a9b': // lock(address,uint64,bytes,uint256,uint256,uint256)
        txInfo.operation = { description: "wallet.ext-tx-info-type-lock" };
        break;
      case '0x53b1a6ce': // claimXmdx()
      case '0x718489c5': // claimUnlocked(address)
      case '0x4e71d92d': // claim()
        txInfo.operation = { description: "wallet.ext-tx-info-type-claim-tokens" };
        break;
      // Known signatures but no clear way to display information about them = consider as generic contract call
      case '0xe9fad8ee': // exit()
      case '0x5b27052e': // upgrade(uint256,bool,bool,bool,bool,bool)
      case '0xac9650d8': // multicall(bytes[])
      // Unreferenced signatures on https://www.4byte.directory/signatures/
      // fallthrough
      case '0x9c629f48': // unknown
      case '0x26759de3': // unknown
      case '0x97b7f010': // unknown
      case '0xb7d253ab': // unknown
        // Silently handled - return a generic transaction.
        txInfo.operation = {
          description: 'wallet.coin-op-contract-call'
        };
        break;
      default:
        Logger.log('wallet', 'Unhandled EVM contract method action:', methodAction)
        // Not handled before - return a generic transaction.
        txInfo.operation = {
          description: 'wallet.coin-op-contract-call'
        };
    }
  }

  /**
   * Returns the param values based on possible abis and transaction input data
   *
   * @param abi Eg: ["function approve(address, uint256) public returns (bool success)"]
   * @param txData Signed transaction string to be published or published on chain
   */
  private extractTransactionParamValues(abi: string[], txData: string): any[] {
    const iface = new utils.Interface(abi);
    let decodedData = iface.parseTransaction({ data: txData });
    if (!decodedData)
      return [];

    return <any[]>decodedData.args;
  }

  /**
   * Returns the indexTH param value, making sure params length is large enough, and that this is an array type.
   * Also ensures that the final array has a minimal size of minArraySize.
   */
  private arrayTransactionParamAt(params: any[], index: number, minArraySize: number): any[] {
    if (params.length <= index)
      throw new Error("Not enough values in params array");

    let value = params[index];
    if (!(value instanceof Array))
      throw new Error("Target parameter is not an array");

    if (value.length < minArraySize)
      throw new Error("Target array has not enough values");

    return value;
  }

  /**
   * Returns the indexTH param value, making sure that this is a string type.
   */
  private stringTransactionParamAt(params: any[], index: number): string {
    if (params.length <= index)
      throw new Error("Not enough values in params array");

    let value = params[index];
    if (!(typeof value === "string"))
      throw new Error("Target parameter is not a string");

    return value;
  }

  private async getERC20TokenInfoOrThrow(contractAddress: string): Promise<ERC20CoinInfo> {
    let coinInfo = await ERC20CoinService.instance.getCoinInfo(this.network, contractAddress);
    if (!coinInfo)
      throw new Error("Unable to get ERC20 token info");

    return coinInfo
  }

  private computeEvents(txInfo: ETHTransactionInfo, receipt: TransactionReceipt): Promise<void> {
    if (!receipt || !receipt.logs)
      return;

    txInfo.events = [];
    for (let log of receipt.logs) {
      if (!log.topics || log.topics.length === 0)
        continue;

      let topicAction = log.topics[0].substring(0, 10); // 0x + 4 hex bytes
      this.fillTxInfoEventsFromTopicAction(topicAction, log.topics, txInfo);
    }

    return;
  }

  private fillTxInfoEventsFromTopicAction(topicAction: string, topics: string[], txInfo: ETHTransactionInfo) {
    let event: EthContractEvent = null;
    switch (topicAction.toLowerCase()) {
      case '0xc3d58168': // TransferSingle(address,address,address,uint256,uint256)
        event = { description: `Sent out NFT` }; break;
      case '0x8c5be1e5': // Approval(address,address,uint256)
        event = { description: `Approved token spending` }; break;
      case '0xddf252ad': // Transfer(address,address,uint256)
        event = { description: `Sent out token` }; break;
      case '0xd78ad95f': // Swap(address,uint256,uint256,uint256,uint256,address)
        event = { description: `Swapped tokens` }; break;
      default:
        console.log("unhandled topic action", topicAction)
    }

    if (event)
      txInfo.events.push(event);
  }

  private createEmptyTransactionInfo(): ETHTransactionInfo {
    let txInfo: ETHTransactionInfo = {
      type: null,
      operation: null,
      events: []
    };
    return txInfo;
  }
}
