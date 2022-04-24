import { TokenType } from "../../../coin";
import { AddressUsage } from "../../../safes/safe";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { ERCTokenInfo } from "../../evms/evm.types";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentHelper } from "../../evms/tx-providers/covalent.helper";
import { EtherscanEVMSubWalletTokenProvider } from "../../evms/tx-providers/etherscan.token.subwallet.provider";

export class IoTeXChainTokenSubWalletProvider extends EtherscanEVMSubWalletTokenProvider<AnyMainCoinEVMSubWallet> {
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

  public async fetchAllTokensTransactions(): Promise<void> {
    let address = await this.subWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);
    let chainId = this.subWallet.networkWallet.network.getMainChainID();
    let tokenBalances = await CovalentHelper.fetchTokenBalances(address, chainId);

    // Convert covalent token balances to ERCTokenInfo types so we can let user know
    // about new tokens found.
    if (tokenBalances) {
      let foundTokenInfo: ERCTokenInfo[] = [];

      tokenBalances.forEach(tb => {
        // Discover only ERC20
        if (tb.supports_erc && tb.supports_erc.indexOf("erc20") >= 0) {
          foundTokenInfo.push({
            type: TokenType.ERC_20,
            symbol: tb.contract_ticker_symbol,
            name: tb.contract_name,
            decimals: `${tb.contract_decimals}`,
            contractAddress: tb.contract_address,
            balance: tb.balance,
            hasOutgoTx: false // ??
          });
        }
      });

      await this.provider.onTokenInfoFound(foundTokenInfo);
    }
  }
}