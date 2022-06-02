import { AddressUsage } from '../../../safes/addressusage';
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../evm.types";
import { ERC20SubWallet } from "../subwallets/erc20.subwallet";
import { MainCoinEVMSubWallet } from "../subwallets/evm.subwallet";
import { ERC20TransactionHelper } from "./erc20transaction.helper";

/**
 * Raw token provider that tries its best to discover tokens and get ERC20 transactions without an
 * advanced api such as etherscan or covalent. Used as a fallback in case other methods are not
 * available.
 */
export class RawEVMSubWalletTokenProvider<SubWalletType extends MainCoinEVMSubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  private latestFromBlockChecked = -1;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string, protected accountApiUrl: string) {
    super(provider, subWallet);

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    //provider.refreshEvery(() => this.fetchAllTokensTransactions(), 30000);
  }

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress.toLowerCase() + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: transaction.contractAddress
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.latestFromBlockChecked === -1 || this.latestFromBlockChecked >= 0;
  }

  // TODO UNFINISHED - this works but a bit painful...
  public async fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    for (let i = 0; i < 50; i++) { // TODO: NON BLOCKING FETCH
      console.log("fetchTransactions", erc20SubWallet, afterTransaction)

      // afterTransaction is not used, we maintain our own logic here for block numbers

      let userAddress = await erc20SubWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);
      console.log("userAddress", userAddress);

      let web3 = await this.subWallet.getWeb3();
      let toBlock = this.latestFromBlockChecked !== -1 ? this.latestFromBlockChecked : await web3.eth.getBlockNumber();
      let fromBlock = toBlock - 5000; // Variable restrictions: max 5000 by heco node - TODO: customize

      console.log("fromBlock", fromBlock, "toBlock", toBlock)

      let tx = await ERC20TransactionHelper.fetchTokenTransactions(
        web3,
        userAddress,
        erc20SubWallet.coin.getContractAddress().toLowerCase(),
        fromBlock,
        toBlock
      );

      console.log("tx", tx)

      // TODO: SAVE TRANSACTIONS

      this.latestFromBlockChecked = fromBlock;
    }
  }

  // TODO FIND A WAY TO DISCOVER SOME TOKENS
  public fetchAllTokensTransactions(): Promise<void> {
    console.log("RAW fetchAllTokensTransactions not implemented");
    return;
  }
}