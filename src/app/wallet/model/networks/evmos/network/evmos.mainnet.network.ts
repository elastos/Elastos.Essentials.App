import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { EvmosBaseNetwork } from "./evmos.base.network";

export class EvmosMainNetNetwork extends EvmosBaseNetwork {
  constructor() {
    super(
      "evmos",
      "Evmos",
      "Evmos",
      "assets/wallet/networks/evmos.png",
      "EVMOS",
      "Evmos Token",
      MAINNET_TEMPLATE,
      9001,
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

    this.averageBlocktime = 7;
  }
}
