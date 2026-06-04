import { TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { KavaBaseNetwork } from './kava.base.network';

export class KavaTestNetNetwork extends KavaBaseNetwork {
  constructor() {
    super(
      'kava',
      'Kava EVM Testnet',
      'Kava Testnet',
      'assets/wallet/networks/kava.svg',
      'KAVA',
      'Kava Token',
      TESTNET_TEMPLATE,
      2221,
      [],
      [
        {
          name: 'Kava Testnet RPC',
          url: 'https://evm.testnet.kava.io'
        }
      ]
    );

    this.averageBlocktime = 5;
  }
}
