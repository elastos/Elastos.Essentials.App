import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { ElastosNetworkWallet } from "../../wallets/elastos/elastos.networkwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/NetworkWallet";
import { Network } from "../network";

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
}