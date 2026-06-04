import { TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { FantomBaseNetwork } from './fantom.base.network';

export class FantomTestNetNetwork extends FantomBaseNetwork {
  constructor() {
    super(
      'fantom',
      'Fantom Testnet',
      'Fantom Testnet',
      'assets/wallet/networks/fantom.png',
      'FTM',
      'Fantom Token',
      TESTNET_TEMPLATE,
      4002,
      [],
      [
        {
          name: 'Fantom Testnet RPC',
          url: 'https://rpc.testnet.fantom.network'
        }
      ]
    );

    this.averageBlocktime = 5; // 1;
  }
}
