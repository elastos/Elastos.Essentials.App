import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { ProviderTransactionInfo, SubWalletTransactionProvider, TransactionProvider } from "../../../providers/transaction.provider";
import { HecoAPI, HecoApiType } from "../heco.api";
import { HECOChainSubWallet } from "../heco.subwallet";

export class HecoChainSubWalletProvider extends EVMSubWalletProvider<HECOChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: HECOChainSubWallet) {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }
}