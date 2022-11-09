import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { KavaBaseNetwork } from "./kava.base.network";

export class KavaMainNetNetwork extends KavaBaseNetwork {
  constructor() {
    super(
      "kava",
      "Kava EVM Co-Chain",
      "Kava",
      "assets/wallet/networks/kava.svg",
      "KAVA",
      "Kava Token",
      MAINNET_TEMPLATE,
      2222,
      [],
      [
      ],
      [
      ],
      [
      ]
    );

    this.builtInCoins = [
    ];

    this.averageBlocktime = 5 // 3;
  }
}
