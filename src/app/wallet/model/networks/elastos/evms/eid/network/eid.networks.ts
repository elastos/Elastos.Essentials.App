import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { TransactionInfoType } from "src/app/wallet/model/tx-providers/transaction.types";
import { NetworkAPIURLType } from "../../../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { ElastosEVMNetwork } from "../../../network/elastos.evm.network";

export abstract class ElastosIdentityChainNetworkBase extends ElastosEVMNetwork<WalletNetworkOptions> {
  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ElastosIdentityChainStandardNetworkWallet = (await import("../networkwallets/standard/identitychain.networkwallet")).ElastosIdentityChainStandardNetworkWallet;
        return new ElastosIdentityChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const ElastosIdentityChainLedgerNetworkWallet = (await import("../networkwallets/ledger/identitychain.networkwallet")).ElastosIdentityChainLedgerNetworkWallet;
        return new ElastosIdentityChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      default:
        Logger.warn('wallet', 'Elastos Identity Chain does not support ', masterWallet.type);
        return null;
    }
  }


  /**
   * User can view information directly on an external browser.
   */
  public getBrowserUrlByType(type: TransactionInfoType, value: string): string {
    let browserUrl = this.getAPIUrlOfType(NetworkAPIURLType.BLOCK_EXPLORER);
    switch (type) {
      case TransactionInfoType.ADDRESS:
        browserUrl += '/address/'
        break;
      case TransactionInfoType.BLOCKID:
        browserUrl += '/blocks/'
        break;
      case TransactionInfoType.TXID:
        browserUrl += '/tx/'
        break;
      default:
        Logger.warn("wallet", "getBrowserUrlByType: not support ", type);
        break;
    }
    return browserUrl + value;
  }

  public getEVMSPVConfigName(): string {
    return StandardCoinName.ETHDID;
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }

  public getMainColor(): string {
    return "a8befa";
  }
}

/**
 * Elastos EID chain (EVM based)
 */
export class ElastosIdentityChainMainNetNetwork extends ElastosIdentityChainNetworkBase {
  constructor() {
    super(
      "elastosidchain",
      "Elastos Identity Chain",
      "EID",
      "assets/wallet/networks/elastos-eid.png",
      MAINNET_TEMPLATE,
      22
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHDID), MAINNET_TEMPLATE);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHDID), MAINNET_TEMPLATE);
    } else
      return null;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['ETHDID'] = { chainID: '22', NetworkID: '22' };
  }
}

/**
 * Elastos Identity Chain
 */
export class ElastosIdentityChainTestNetNetwork extends ElastosIdentityChainNetworkBase {
  constructor() {
    super(
      "elastosidchain",
      "Elastos Identity Chain Testnet",
      "EID Testnet",
      "assets/wallet/networks/elastos-eid.png",
      TESTNET_TEMPLATE,
      23
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHDID), TESTNET_TEMPLATE);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHDID), TESTNET_TEMPLATE);
    } else
      return null;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['ETHDID'] = { chainID: '23', NetworkID: '23' };
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    return 1;
  }
}