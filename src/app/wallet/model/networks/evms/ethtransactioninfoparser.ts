import abiDecoder from "abi-decoder";
import { Logger } from "src/app/logger";
import { TransactionReceipt } from "web3-core";
import { ERC20CoinService } from "../../../services/evm/erc20coin.service";
import { AnyNetwork } from "../network";

export enum ETHOperationType {
  ERC20_TOKEN_APPROVE = "erc20_token_approve", // The contract seems to be a request to approve a caller to spend ERC20 tokens on behalf of the user
  // TODO: ERC721 and ERC1155 approve methods
  OTHER_CONTRACT_CALL = "other_contract_call" // Generic / undetected transaction type
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
    await this.computeEvents(txInfo, receipt);
    return txInfo;
  }

  private async computeOperation(txInfo: ETHTransactionInfo, txData?: string, txTo?: string): Promise<void> {
    let erc20ABI = await (await import("../../../../../assets/wallet/ethereum/StandardErc20ABI.json")).default;
    abiDecoder.addABI(erc20ABI);

    // Try to parse a ERC20 method from the data. Is the transaciton is not ERC20 or for any
    // other reason, method will be undefined.
    let method: { name: string, params: unknown[] } = abiDecoder.decodeMethod(txData);
    Logger.log("wallet", "Decoded transaction method:", method);

    if (method && method.name == "approve") {
      // Method is "approve". "to" must be a ERC20 contract and we'll try to resolve the token name.
      let coinInfo = await ERC20CoinService.instance.getCoinInfo(this.network, txTo, null);
      if (coinInfo) {
        Logger.log("wallet", "Got ERC20 coin info at address", txTo, coinInfo);

        let operation: ApproveERC20Operation = {
          description: "Approve spending " + coinInfo.coinSymbol,
          tokenName: coinInfo.coinName,
          symbol: coinInfo.coinSymbol
        }

        txInfo.type = ETHOperationType.ERC20_TOKEN_APPROVE;
        txInfo.operation = operation;
      }
      else {
        Logger.log("wallet", "No ERC20 coin info found at address", txTo);
      }
    }
    else {
      // Not handled before - return a generic transaction.
      txInfo.type = ETHOperationType.OTHER_CONTRACT_CALL;
      txInfo.operation = {
        description: "Contract call"
      };
    }
  }

  private computeEvents(txInfo: ETHTransactionInfo, receipt: TransactionReceipt): Promise<void> {
    if (!receipt || !receipt.logs)
      return;

    txInfo.events = [];
    for (let log of receipt.logs) {
      if (!log.topics || log.topics.length === 0)
        continue;

      let topicAction = log.topics[0].substring(0, 10); // 0x + 4 hex bytes
      console.log("topicAction", topicAction)
      /* for (let topic of log.topics) {
        topic
      } */

      this.fillTxInfoEventsFromTopicAction(topicAction, log.topics, txInfo);
      /*
            if (topicAction.startsWith('0xc3d58168')) {

              txInfo.events.push({
                description: ' Transfer single!'
              })
              console.log('TransferSingle')
            } */
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

/*
let abi = ["function approve(address _spender, uint256 _value) public returns (bool success)"]
let provider = ethers.getDefaultProvider('ropsten')
let contract = new ethers.Contract(tokenAddress, abi, provider)
await contract.approve(accountAddress, amount)
*/


/*existing tx INPUT or unpublished TXDATA:
  MAIN ACTION
"Call approve on token xxx"
txdata: method signature(short) + params values

LOGS:
  ONLY EVENTS HERE ? OR QLSO METHOD CQLLS ?
  "Approved token xxx"
  - event signature
    - params values
*/

// EVENTS METHODS:
// 0x0febdd49 safeTransferFrom(address,address,uint256,uint256)
// 0xddf252ad Transfer(address,address,uint256)
// 0x8c5be1e5 Approval(address,address,uint256)
// 0x1c411e9a Sync(uint112,uint112)
// 0xd78ad95f Swap(address,uint256,uint256,uint256,uint256,address)
// 0xc3d58168 TransferSingle(address,address,address,uint256,uint256)

/* totalSupply:'0x18160ddd'
balanceOf:     '0x70a08231'
transfer:      '0xa9059cbb'
transferFrom:  '0x23b872dd'
approve:       '0x095ea7b3'
allowance:     '0xdd62ed3e'
decimals:      '0x313ce567' */

// EVENTS:
// 0xc3d58168 c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62 - TransferSingle(address,address,address,uint256,uint256)
// 0x9c7402d8 6e84d29bfe63a4d3be98b94bf664429f2565f0a9908a6563f78880e5 - TransferSingleWithMemo(address,address,address,uint256,uint256,string)