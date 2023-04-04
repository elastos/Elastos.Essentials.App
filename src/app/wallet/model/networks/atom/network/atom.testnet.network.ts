import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AtomBaseNetwork } from "./atom.base.network";

export class AtomTestNetNetwork extends AtomBaseNetwork {
  constructor() {
    super(
      "atom",
      "Cosmos Atom Chain Testnet",
      "Atom Theta Testnet",
      "assets/wallet/networks/atom.svg",
      "ATOM",
      "Atom Coin",
      TESTNET_TEMPLATE,
      'cosmos',
      "m/44'/118'/0'/0/0",
    );

    this.averageBlocktime = 6;
  }
}
