import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentSubWalletTokenProvider } from "../../evms/tx-providers/covalent.token.subwallet.provider";

export class IoTeXChainTokenSubWalletProvider extends CovalentSubWalletTokenProvider<AnyMainCoinEVMSubWallet> {
  protected getProviderTransactionInfo(transaction: { blockHash: string; blockNumber: string; confirmations: string; contractAddress: string; cumulativeGasUsed: string; from: string; gas: string; gasPrice: string; gasUsed: string; hash: string; input: string; isError: string; nonce: string; timeStamp: string; to: string; transactionIndex: string; txreceipt_status: string; value: string; Direction: TransactionDirection; isERC20TokenTransfer: boolean; }): ProviderTransactionInfo {
    throw new Error("IoTeXChainTokenSubWalletProvider - getProviderTransactionInfo(): Method not implemented.");
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false;
  }

  /* public async fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    console.log("fetchTransactions", erc20SubWallet)

    let testBlockNumber = await this.subWallet.getWeb3().eth.getBlockNumber();
    console.log("testBlockNumber", testBlockNumber);

    let userAddress = await erc20SubWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);
    console.log("userAddress", userAddress)

    let tx = await ERC20TransactionHelper.fetchTokenTransactions(
      this.subWallet.getWeb3(),
      userAddress,
      await erc20SubWallet.getTokenAccountAddress(),
      testBlockNumber - 8000,
      testBlockNumber
    );

    console.log("tx", tx)

    //Logger.log("wallet", "IoTeXChainTokenSubWalletProvider: fetchTransactions() not implemented");
    return;
  } */


}