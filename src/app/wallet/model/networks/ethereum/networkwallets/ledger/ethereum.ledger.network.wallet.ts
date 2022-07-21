import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { LedgerEVMNetworkWallet } from "../../../evms/networkwallets/ledger/ledger.evm.networkwallet";
import { EtherumTransactionProvider as EthereumTransactionProvider } from "../../tx-providers/ethereum.transaction.provider";

export class EthereumLedgerNetworkWallet extends LedgerEVMNetworkWallet<any> {
  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new EthereumTransactionProvider(this);
  }
}