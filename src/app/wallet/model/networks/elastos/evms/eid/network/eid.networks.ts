import { Logger } from "src/app/logger";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { ElastosNetworkBase } from "../../../network/elastos.base.network";
import { ElastosIdentityChainLedgerNetworkWallet } from "../networkwallets/ledger/identitychain.networkwallet";
import { ElastosIdentityChainStandardNetworkWallet } from "../networkwallets/standard/identitychain.networkwallet";

export abstract class ElastosIdentityChainNetworkBase extends ElastosNetworkBase<WalletNetworkOptions> {
  public newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new ElastosIdentityChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        return new ElastosIdentityChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      default:
        Logger.warn('wallet', 'Elastos Identity Chain does not support ', masterWallet.type);
        return null;
    }
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