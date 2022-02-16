import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { ElastosIdentityChainNetworkWallet } from "../../wallets/elastos/networkwallets/identitychain.networkwallet";
import { ElastosMainChainNetworkWallet } from "../../wallets/elastos/networkwallets/mainchain.networkwallet";
import { ElastosSmartChainNetworkWallet } from "../../wallets/elastos/networkwallets/smartchain.networkwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { ElastosNetworkBase } from "./elastos.base.network";

export class ElastosMainChainTestNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastos", "Elastos main chain Testnet", TESTNET_TEMPLATE);
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosMainChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }
}

export class ElastosSmartChainTestNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastossmartchain", "Elastos smart chain Testnet", TESTNET_TEMPLATE);
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosSmartChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];
    availableCoins.push(new ERC20Coin("TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", 0, TESTNET_TEMPLATE, false));
    return availableCoins;
  }

  public getMainChainID(): number {
    return 21; // ETHSC is the main evm network for elastos
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHSC'] = { ChainID: 21, NetworkID: 21 };
  }
}

/**
 * Elastos identity chain
 */
export class ElastosIdentityChainTestNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastosidchain", "Elastos identity chain", TESTNET_TEMPLATE);
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosIdentityChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getMainChainID(): number {
    return 23;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHDID'] = { ChainID: 23, NetworkID: 23 };
  }
}