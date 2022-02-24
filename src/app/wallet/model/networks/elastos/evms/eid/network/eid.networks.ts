import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { ElastosNetworkBase } from "../../../network/elastos.base.network";
import { ElastosIdentityChainStandardNetworkWallet } from "../networkwallets/identitychain.networkwallet";

export abstract class ElastosIdentityChainNetworkBase extends ElastosNetworkBase<WalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosIdentityChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      default:
        return null;
    }

    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
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
}


/**
 * Elastos EID chain (EVM based)
 */
export class ElastosIdentityChainMainNetNetwork extends ElastosIdentityChainNetworkBase {
  constructor() {
    super(
      "elastosidchain",
      "Elastos identity chain",
      "assets/wallet/coins/ela-turquoise.svg",
      MAINNET_TEMPLATE
    );
  }

  public getMainChainID(): number {
    return 22; // ETHDID
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHDID'] = { ChainID: 22, NetworkID: 22 };
  }
}


/**
 * Elastos identity chain
 */
export class ElastosIdentityChainTestNetNetwork extends ElastosIdentityChainNetworkBase {
  constructor() {
    super(
      "elastosidchain",
      "Elastos identity chain",
      "assets/wallet/coins/ela-turquoise.svg",
      TESTNET_TEMPLATE
    );
  }

  public getMainChainID(): number {
    return 23;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHDID'] = { ChainID: 23, NetworkID: 23 };
  }
}