import { utils } from "ethers";
import { Logger } from "src/app/logger";
import type { TransactionReceipt } from "web3-core";
import { ERC20CoinInfo, ERC20CoinService } from "../../../services/evm/erc20coin.service";
import type { AnyNetwork } from "../network";

export enum ETHOperationType {
  ERC20_TOKEN_APPROVE = "erc20_token_approve", // The contract seems to be a request to approve a caller to spend ERC20 tokens on behalf of the user
  // TODO: ERC721 and ERC1155 approve methods
  OTHER_CONTRACT_CALL = "other_contract_call", // Generic / undetected transaction type
  NOT_A_CONTRACT_CALL = "not_a_contract_call" // Standard transfer, no contract data payload
}

export type EthContractOperation = {
  //opSignature4Bytes: string; // Event or method operation signature. Extracted from receipt topics. eg: 0xddf252ad for Transfer(address,address,uint256)
  description: string; // Operation description, human readable, already translated. Eg: Send 218.56 ELK, Approve third party to spend USDC
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
      throw new Error("ETHTransactionInfoParser can be created only with a valid transaction data string starting with 0x");
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

    let coinInfo: ERC20CoinInfo;
    let methodAction = txData.substring(0, 10); // 0x + 4 hex bytes
    switch (methodAction) {
      case '0x0febdd49': // ERC1155 safeTransferFrom(address,address,uint256,uint256)
        txInfo.operation = { description: "Send ERC1155 NFT" };
        break;

      case '0x23b872dd': // ERC721 transferFrom(address,address,uint256) - TODO: missing - ERC721 safeTransferFrom
        txInfo.operation = { description: "Send tokens" };
        break;

      case '0xa9059cbb': // transfer(address,uint256)
        coinInfo = await ERC20CoinService.instance.getCoinInfo(this.network, txTo); // txTo is the contract address
        if (coinInfo)
          txInfo.operation = { description: `Send ${coinInfo.coinSymbol}` };
        else
          txInfo.operation = { description: "Send tokens" };
        break;

      case '0x095ea7b3': // approve(address,uint256)
        try {
          // Method is "approve". "to" must be a ERC20 contract and we'll try to resolve the token name.
          let coinInfo = await this.getERC20TokenInfoOrThrow(txTo);
          let operation: ApproveERC20Operation = {
            description: `Approve ${coinInfo.coinSymbol}`,
            tokenName: coinInfo.coinName,
            symbol: coinInfo.coinSymbol
          }

          txInfo.type = ETHOperationType.ERC20_TOKEN_APPROVE;
          txInfo.operation = operation;
        }
        catch (e) {
          txInfo.type = ETHOperationType.ERC20_TOKEN_APPROVE;

          let operation: ApproveERC20Operation = {
            description: `Approve token`,
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
          txInfo.operation = { description: `${fromCoinInfo.coinSymbol} → ${this.network.getMainTokenSymbol()}` };
        }
        catch (e) {
          txInfo.operation = { description: "Swap ERC20 tokens for native tokens" };
        }
        break;

      case '0x7ff36ab5': // swapExactETHForTokens(uint256,address[],address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function swapExactETHForTokens(uint256,address[],address,uint256) public returns (bool success)"], txData);
          let tokensPath = this.arrayTransactionParamAt(params, 1, 2);
          let toTokenAddress = tokensPath[tokensPath.length - 1]; // Last entry of tokensPath is the destination ERC20 token.
          let toCoinInfo = await this.getERC20TokenInfoOrThrow(toTokenAddress);
          txInfo.operation = { description: `${this.network.getMainTokenSymbol()} → ${toCoinInfo.coinSymbol}` };
        }
        catch (e) {
          txInfo.operation = { description: "Swap native tokens for ERC20 tokens" };
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

          txInfo.operation = { description: `${fromCoinInfo.coinSymbol} → ${toCoinInfo.coinSymbol}` };
        }
        catch (e) {
          txInfo.operation = { description: "Swap tokens" };
        }
        break;

      case '0xad58bdd1': // relayTokens(address,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function relayTokens(address,address,uint256) public returns (bool success)"], txData);
          let tokenAddress = this.stringTransactionParamAt(params, 0); // From
          let tokenInfo = await this.getERC20TokenInfoOrThrow(tokenAddress);
          txInfo.operation = { description: `Bridge ${tokenInfo.coinSymbol} tokens` };
        }
        catch (e) {
          txInfo.operation = { description: "Bridge tokens" };
        }
        break;

      case '0xe8e33700': // addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) public returns (bool success)"], txData);
          let tokenAAddress = this.stringTransactionParamAt(params, 0);
          let tokenBAddress = this.stringTransactionParamAt(params, 1);
          let tokenAInfo = await this.getERC20TokenInfoOrThrow(tokenAAddress);
          let tokenBInfo = await this.getERC20TokenInfoOrThrow(tokenBAddress);
          txInfo.operation = { description: `Add ${tokenAInfo.coinSymbol} + ${tokenBInfo.coinSymbol} LP` };
        }
        catch (e) {
          txInfo.operation = { description: "Liquidity deposit" };
        }
        break;

      case '0xbaa2abde': // removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)
        try {
          let params = this.extractTransactionParamValues(["function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) public returns (bool success)"], txData);
          let tokenAAddress = this.stringTransactionParamAt(params, 0);
          let tokenBAddress = this.stringTransactionParamAt(params, 1);
          let tokenAInfo = await this.getERC20TokenInfoOrThrow(tokenAAddress);
          let tokenBInfo = await this.getERC20TokenInfoOrThrow(tokenBAddress);
          txInfo.operation = { description: `Remove ${tokenAInfo.coinSymbol} + ${tokenBInfo.coinSymbol} LP` };
        }
        catch (e) {
          txInfo.operation = { description: "Remove liquidity" };
        }
        break;

      case '0xded9382a': // removeLiquidityETHWithPermit(address,uint256,uint256,uint256,address,uint256,bool,uint8,bytes32,bytes32)
        txInfo.operation = { description: "Remove liquidity" };
        break;

      case '0x441a3e70': // withdraw(uint256,uint256)
        txInfo.operation = { description: "Withdraw" }; // TODO: refine - withdraw what?
        break;
      case '0x3d18b912': // getReward()
        txInfo.operation = { description: "Get rewards" };
        break;
      case '0x2459a699': // getBoosterReward()
        txInfo.operation = { description: "Get booster rewards" };
        break;
      case '0xe2bbb158': // deposit(uint256,uint256)
        txInfo.operation = { description: "Deposit" }; // TODO: refine - deposit what?
        break;
      case '0xb6b55f25': // deposit(uint256)
        txInfo.operation = { description: "Deposit" }; // TODO: refine - deposit what?
        break;
      case '0xecd9ba82': // stakeWithPermit(uint256,uint256,uint8,bytes32,bytes32)
        txInfo.operation = { description: "Stake" }; // TODO: refine - stake what?
        break;
      case '0xe9fad8ee': // exit()
      // Unreferenced signatures on https://www.4byte.directory/signatures/
      // fallthrough
      case '0xb7d253ab':
        // Silently handled - return a generic transaction.
        txInfo.operation = {
          description: "Contract call"
        };
        break;
      default:
        Logger.log('wallet', 'Unhandled method action:', methodAction)
        // Not handled before - return a generic transaction.
        txInfo.operation = {
          description: "Contract call"
        };
    }
  }


  /* TODO ABOVE - METHODS - from heco

    0x2e1a7d4d // withdraw(uint256)
    0xf1d5314a // withdrawApplication(uint256)
    0xdb006a75 // redeem(uint256)
    0xa694fc3a // stake(uint256)
    0x60de1a9b // lock(address,uint64,bytes,uint256,uint256,uint256)
    0x9c629f48 // unknown
    0x53b1a6ce // claimXmdx()
    0x1249c58b // mint()
    0xd0def521 // mint(address,string)

    */

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
