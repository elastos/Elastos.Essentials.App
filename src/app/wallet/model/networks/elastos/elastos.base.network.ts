import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID, StandardCoinName } from "../../Coin";
import { ElastosERC20SubWallet } from "../../wallets/elastos/elastos.erc20.subwallet";
import { ElastosNetworkWallet } from "../../wallets/elastos/elastos.networkwallet";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { Network } from "../network";

export abstract class ElastosNetworkBase extends Network {
  constructor(displayName: string) {
    super("elastos", displayName, "assets/wallet/networks/elastos.svg");
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosNetworkWallet(masterWallet, this);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID, startBackgroundUpdates = true): ERC20SubWallet {
    let subWallet = new ElastosERC20SubWallet(networkWallet, coinID);
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getMainEvmRpcApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC));
  }

  public getMainTokenSymbol(): string {
    return 'ELA';
  }

  public abstract getMainChainID(): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig);
}