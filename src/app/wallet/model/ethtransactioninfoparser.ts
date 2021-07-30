import abiDecoder from "abi-decoder";
import { Logger } from "src/app/logger";
import { ERC20CoinService } from "../services/erc20coin.service";

export enum ETHTransactionType {
  TOKEN_APPROVE = "token_approve", // The contract seems to be a request to approve a caller to spend tokens on behalf of the user
  CONTRACT_CALL = "contract_call" // Generic / undetected transaction type
}

export type ETHTransactionInfo = {
  txType: ETHTransactionType
}

export type ETHTransactionTokenApproveInfo = ETHTransactionInfo & {
  // Nothing yet
  tokenName: string
}

/**
 * Utility to extract various information such as a called method name, from a received web3 transaction
 * data (ex: 0x.......).
 */
export class ETHTransactionInfoParser {
  /**
   * @param txData Transaction data (0x...)
   * @param txValue Value to be spent by the transaction
   * @param txTo Transaction destination address
   */
  constructor(private txData: string, private txValue: string, private txTo: string) {
    if (!txData || !txData.startsWith("0x")) {
      throw new Error("ETHTransactionInfoParser can be created only with a valid transaction data string starting with 0x");
    }
  }

  /**
   * Computes and returns the transaction information.
   */
  public async computeInfo(): Promise<ETHTransactionInfo> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let erc20ABI = require( "../../../assets/wallet/ethereum/StandardErc20ABI.json");
    abiDecoder.addABI(erc20ABI);

    // Try to parse a ERC20 method from the data. Is the transaciton is not ERC20 or for any
    // other reason, method will be undefined.
    let method: {name: string, params: unknown[]} = abiDecoder.decodeMethod(this.txData);
    Logger.log("wallet", "Decoded transaction method:", method);

    if (method && method.name == "approve") {
      // Method is "approve". "to" must be a ERC20 contract and we'll try to resolve the token name.
      let coinInfo = await ERC20CoinService.instance.getCoinInfo(this.txTo, null);
      if (coinInfo) {
        Logger.log("wallet", "Got ERC20 coin info at address", this.txTo, coinInfo);
        return {
          txType: ETHTransactionType.TOKEN_APPROVE,
          tokenName: coinInfo.coinName
        } as ETHTransactionTokenApproveInfo;
      }
      else {
        Logger.log("wallet", "No ERC20 coin info found at address", this.txTo);
      }
    }

    // Not handled before - return a generic transaction.
    return {
      txType: ETHTransactionType.CONTRACT_CALL
    }
  }
}