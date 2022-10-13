import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk/typings/config";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { StandardCoinName } from "src/app/wallet/model/coin";
import type { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import type { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../../base/networkwallets/networkwallet";
import { ElastosNetworkBase } from "../../network/elastos.base.network";

export abstract class ElastosMainChainNetworkBase extends ElastosNetworkBase<ElastosMainChainWalletNetworkOptions> {
  // eslint-disable-next-line @typescript-eslint/prefer-as-const
  public static networkKey: "elastos" = "elastos";

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ElastosMainChainStandardNetworkWallet = (await import("../networkwallets/standard/mainchain.networkwallet")).ElastosMainChainStandardNetworkWallet;
        return new ElastosMainChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const ElastosMainChainLedgerNetworkWallet = (await import("../networkwallets/ledger/mainchain.networkwallet")).ElastosMainChainLedgerNetworkWallet;
        return new ElastosMainChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      case WalletType.MULTI_SIG_STANDARD:
        const ElastosMainChainStandardMultiSigNetworkWallet = (await import("../networkwallets/standardmultisig/mainchain.networkwallet")).ElastosMainChainStandardMultiSigNetworkWallet;
        return new ElastosMainChainStandardMultiSigNetworkWallet(masterWallet as StandardMultiSigMasterWallet, this);
      default:
        return null;
    }
  }

  public getDefaultWalletNetworkOptions(): ElastosMainChainWalletNetworkOptions {
    return {
      network: ElastosMainChainNetworkBase.networkKey,
      singleAddress: true
    }
  }

  public getMainColor(): string {
    return "444444";
  }
}

/**
 * Elastos main chain
 */
export class ElastosMainChainMainNetNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super(
      ElastosMainChainNetworkBase.networkKey,
      "Elastos Main Chain",
      "Elastos Main",
      "assets/wallet/networks/elastos.svg",
      MAINNET_TEMPLATE
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ELA), MAINNET_TEMPLATE);
    else
      return null;
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }
}


export class ElastosMainChainTestNetNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super(
      ElastosMainChainNetworkBase.networkKey,
      "Elastos Main Chain Testnet",
      "Elastos Main Testnet",
      "assets/wallet/networks/elastos.svg",
      TESTNET_TEMPLATE
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ELA), TESTNET_TEMPLATE);
    else
      return null;
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }
}
