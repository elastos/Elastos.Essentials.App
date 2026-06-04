import { TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { FusionBaseNetwork } from './fusion.base.network';

// Explorer: https://fsnex.com/
export class FusionTestNetNetwork extends FusionBaseNetwork {
  constructor() {
    super(
      'fusion',
      'Fusion Testnet',
      'Fusion Testnet',
      'assets/wallet/networks/fusion.png',
      'FSN',
      'FSN',
      TESTNET_TEMPLATE,
      46688,
      [],
      [
        {
          name: 'Fusion Testnet RPC',
          url: 'https://testnet.fusionnetwork.io'
        }
      ]
    );

    this.averageBlocktime = 5;
  }
}
