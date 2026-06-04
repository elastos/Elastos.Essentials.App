import { TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { BSCBaseNetwork } from './bsc.base.network';

export class BSCTestNetNetwork extends BSCBaseNetwork {
  constructor() {
    super(
      'bsc',
      'BNB Smart Chain Testnet',
      'BSC Testnet',
      'assets/wallet/networks/bscchain.png',
      'BNB',
      'Binance Coin',
      TESTNET_TEMPLATE,
      97,
      [],
      [
        {
          name: 'BSC Testnet RPC',
          url: 'https://data-seed-prebsc-1-s1.binance.org:8545'
        }
      ]
    );

    this.averageBlocktime = 5; // 3;
  }
}
