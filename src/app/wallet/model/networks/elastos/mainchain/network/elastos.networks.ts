import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { ElastosMainChainWalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVNetworkConfig } from "../../../../../services/wallet.service";
import { AnyNetworkWallet } from "../../../base/networkwallets/networkwallet";
import { ElastosNetworkBase } from "../../network/elastos.base.network";
import { ElastosMainChainLedgerNetworkWallet } from "../networkwallets/ledger/mainchain.networkwallet";
import { ElastosMainChainStandardNetworkWallet } from "../networkwallets/standard/mainchain.networkwallet";
import { ElastosMainChainStandardMultiSigNetworkWallet } from "../networkwallets/standardmultisig/mainchain.networkwallet";

export abstract class ElastosMainChainNetworkBase extends ElastosNetworkBase<ElastosMainChainWalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosMainChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      case WalletType.LEDGER:
        wallet = new ElastosMainChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
        break;
      case WalletType.MULTI_SIG_STANDARD:
        wallet = new ElastosMainChainStandardMultiSigNetworkWallet(masterWallet as StandardMultiSigMasterWallet, this);
        break;
      default:
        return null;
    }

    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
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

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }
}
