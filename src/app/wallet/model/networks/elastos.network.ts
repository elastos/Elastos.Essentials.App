import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../services/wallet.service";
import { CoinID, ERC20Coin, StandardCoinName } from "../Coin";
import { ElastosERC20SubWallet } from "../wallets/elastos/elastos.erc20.subwallet";
import { ElastosNetworkWallet } from "../wallets/elastos/elastos.networkwallet";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";
import { Network } from "./network";

export class ElastosNetwork extends Network {
  constructor() {
    super("elastos", "Elastos", "assets/wallet/networks/elastos.svg");
  }

  public getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    if (networkTemplate == MAINNET_TEMPLATE) {
      availableCoins.push(new ERC20Coin("TTECH", "TTECH", "Trinity Tech", "0xa4e4a46b228f3658e96bf782741c67db9e1ef91c", MAINNET_TEMPLATE, false));

      // Community ERC20 tokens - could be removed in the future - for now only to create some synergy
      availableCoins.push(new ERC20Coin("DMA", "DMA", "DMA Token", "0x9c22cec60392cb8c87eb65c6e344872f1ead1115", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("ELP", "ELP", "Elaphant", "0x677d40ccc1c1fc3176e21844a6c041dbd106e6cd", MAINNET_TEMPLATE, false));
    }
    else if (networkTemplate == TESTNET_TEMPLATE) {
      availableCoins.push(new ERC20Coin("TTECH", "TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", TESTNET_TEMPLATE, false));
    }

    return availableCoins;
  }

  public createNetworkWallet(masterWallet: MasterWallet): NetworkWallet {
    return new ElastosNetworkWallet(masterWallet, this);
  }

  public createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID): ERC20SubWallet {
    return new ElastosERC20SubWallet(networkWallet, coinID);
  }

  public getMainEvmRpcApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC));
  }

  public getMainTokenSymbol(): string {
    return 'ELA';
  }

  private static LrwNet = {
    'ELA': {
      "ChainParameters":{
        "MagicNumber":20200501,
        "StandardPort":40008,
        "DNSSeeds":["longrunweather.com"],
        "CheckPoints":[[0,"d8d33c8a0a632ecc418bd7f09cd315dfc46a7e3e98e48c50c70a253e6062c257",1513936800,486801407]]
      }
    },
    "IDChain":{
      "ChainParameters":{
        "MagicNumber":20200503,
        "StandardPort":41008,
        "DNSSeeds":["longrunweather.com"],
        "CheckPoints":[[0,"56be936978c261b2e649d58dbfaf3f23d4a868274f5522cd2adb4308a955c4a3",1530360000,486801407]]
      }
    },
    'ETHDID': {'ChainID': 24, 'NetworkID': 24}
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};

    switch (networkTemplate) {
      case (MAINNET_TEMPLATE):
        onGoingConfig['ETHSC'] = {ChainID: 20, NetworkID: 20};
        onGoingConfig['ETHDID'] = {ChainID: 22, NetworkID: 22};
        return;
      case (TESTNET_TEMPLATE):
        onGoingConfig['ETHSC'] = {ChainID: 21, NetworkID: 21};
        onGoingConfig['ETHDID'] = {ChainID: 23, NetworkID: 23};
        return;
      case 'LRW':
        onGoingConfig['ELA'] = {
          "ChainParameters":{
            "MagicNumber":20200501,
            "StandardPort":40008,
            "DNSSeeds":["longrunweather.com"],
            "CheckPoints":[[0,"d8d33c8a0a632ecc418bd7f09cd315dfc46a7e3e98e48c50c70a253e6062c257",1513936800,486801407]]
          }
        };
        onGoingConfig["IDChain"] = {
          "ChainParameters":{
            "MagicNumber":20200503,
            "StandardPort":41008,
            "DNSSeeds":["longrunweather.com"],
            "CheckPoints":[[0,"56be936978c261b2e649d58dbfaf3f23d4a868274f5522cd2adb4308a955c4a3",1530360000,486801407]]
          }
        };
        onGoingConfig['ETHDID'] = {ChainID: 24, NetworkID: 24};
        return;
    }
  }
}