import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVNetworkConfig } from "../../../../../services/wallet.service";
import { NetworkAPIURLType } from "../../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../../base/networkwallets/networkwallet";
import { ElastosNetworkBase } from "../../network/elastos.base.network";
import { ElastosMainChainLedgerNetworkWallet } from "../networkwallets/ledger/mainchain.networkwallet";
import { ElastosMainChainStandardNetworkWallet } from "../networkwallets/standard/mainchain.networkwallet";
import { ElastosMainChainStandardMultiSigNetworkWallet } from "../networkwallets/standardmultisig/mainchain.networkwallet";

export abstract class ElastosMainChainNetworkBase extends ElastosNetworkBase<ElastosMainChainWalletNetworkOptions> {
  public newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new ElastosMainChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        return new ElastosMainChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      case WalletType.MULTI_SIG_STANDARD:
        return new ElastosMainChainStandardMultiSigNetworkWallet(masterWallet as StandardMultiSigMasterWallet, this);
      default:
        return null;
    }
  }

  public getDefaultWalletNetworkOptions(): ElastosMainChainWalletNetworkOptions {
    return {
      network: "elastos",
      singleAddress: true
    }
  }
}

/**
 * Elastos main chain
 */
export class ElastosMainChainMainNetNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super(
      "elastos",
      "Elastos main chain",
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

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
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
      "elastos",
      "Elastos main chain Testnet",
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

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }
}
