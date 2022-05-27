import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { telosMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { telosMainnetElkSwapProvider } from "../earn/swap.providers";
import { TelosBaseNetwork } from "./telos.base.network";

export class TelosMainNetNetwork extends TelosBaseNetwork {
  constructor() {
    super(
      "telos",
      "Telos EVM",
      "assets/wallet/networks/telos.png",
      "TLOS",
      "Telos",
      MAINNET_TEMPLATE,
      40,
      [
      ],
      [],
      [
        telosMainnetElkSwapProvider
      ],
      [
        telosMainnetElkBridgeProvider
      ]
    );

    this.averageBlocktime = 5 // 2;
  }
}
