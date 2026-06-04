import { CoinID, StandardCoinName } from '../../../../../coin';
import { AnyNetworkWallet } from '../../../../base/networkwallets/networkwallet';
import { ERC20SubWallet } from '../../../../evms/subwallets/erc20.subwallet';

/**
 * Subwallet for Eco-ERC20 tokens.
 */
export class EcoERC20SubWallet extends ERC20SubWallet {
  // Centralized mapping for ECO ERC20 token contract addresses to icon assets
  private static readonly ECO_TOKEN_ICON_MAP: Record<string, string> = {
    '0x45ec25a63e010bfb84629242f40dda187f83833e': 'assets/wallet/coins/btcd.png',
    '0x67d8183f13043be52f64fb434f1aa5e5d1c58775': 'assets/wallet/coins/fist.png',
    '0x8152557dd7d8dbfa2e85eae473f8b897a5b6cca9': 'assets/wallet/coins/pga.png',
    '0x1c4e7cd89ea67339d4a5ed2780703180a19757d7': 'assets/wallet/coins/usdt.svg'
  };

  constructor(networkWallet: AnyNetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID, 'ECO-ERC20 token');

    this.spvConfigEVMCode = StandardCoinName.ETHECO;
  }

  public getMainIcon(): string {
    const contract = this.coin.getContractAddress();
    const addr = contract ? contract.toLowerCase() : '';
    return EcoERC20SubWallet.ECO_TOKEN_ICON_MAP[addr] ?? 'assets/wallet/networks/elastos-eco.svg';
  }

  public getSecondaryIcon(): string {
    return null;
    //return "assets/wallet/coins/eth-purple.svg";
  }

  public getDisplayableERC20TokenInfo(): string {
    return ''; // GlobalLanguageService.instance.translate('wallet.ela-erc20'); // "Elastos ERC20 token" is confusing.
  }

  public supportInternalTransactions() {
    return false;
  }
}
