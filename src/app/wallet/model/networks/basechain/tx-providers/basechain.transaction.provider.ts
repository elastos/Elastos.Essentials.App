import { EtherscanAPIVersion } from "../../evms/evm.types";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { EtherscanEVMSubWalletTokenProvider, FetchMode } from "../../evms/tx-providers/etherscan.token.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

/**
 * Base transaction history via Blockscout (base.blockscout.com), which exposes a
 * free, public, Etherscan-compatible V1 API (no API key needed, so no &chainid).
 * Compatibility2 = ERC-20 (tokentx) + ERC-721 (tokennfttx). ERC-1155 (token1155tx)
 * is not served by Blockscout's V1 API today; enabling it would require a paid
 * Etherscan v2 key (Compatibility3) — tracked as a follow-up.
 */
export class BaseChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new EtherscanEVMSubWalletProvider(this, mainCoinSubWallet, undefined, EtherscanAPIVersion.V1);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new EtherscanEVMSubWalletTokenProvider(this, mainCoinSubWallet, FetchMode.Compatibility2, undefined, EtherscanAPIVersion.V1);
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, mainCoinSubWallet, undefined, EtherscanAPIVersion.V1);
  }
}
