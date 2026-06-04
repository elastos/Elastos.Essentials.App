import { CoinID, StandardCoinName } from "../../../../../coin";
import { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { ERC20SubWallet } from "../../../../evms/subwallets/erc20.subwallet";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { Logger } from "src/app/logger";
import { Config } from "src/app/wallet/config/Config";
import { Util } from "src/app/model/util";
import { EVMSafe } from "../../../../evms/safes/evm.safe";
import BigNumber from 'bignumber.js';
import { ElastosPGPNetworkBase } from "../network/pgp.networks";

/**
 * Subwallet for Eco-ERC20 tokens.
 */
export class PGPERC20SubWallet extends ERC20SubWallet {
  private withdrawContract: any;
  private withdrawContractAddress: string;

  // Centralized mapping for ECO ERC20 token contract addresses to icon assets
  private static readonly TOKEN_ICON_MAP: Record<string, string> = {
    '0x0000000000000000000000000000000000000065': 'assets/wallet/networks/elastos-eco.svg',
    '0xf9bf836fed97a9c9bfe4d4c28316b9400c59cc6b': 'assets/wallet/coins/btcd.png',
    '0x800e5c441b84a3e809e2ec922beee9f32f954b11': 'assets/wallet/coins/fist.png',
    '0xdf72788af68e7902f61377d246dd502b0b383385': 'assets/wallet/coins/usdt.svg'
  };

  constructor(networkWallet: AnyNetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID, "PGP-ERC20 token");

    this.spvConfigEVMCode = StandardCoinName.ETHECOPGP;
    this.withdrawContractAddress = Config.ETHECOPGP_WITHDRAW_ADDRESS.toLowerCase();
    this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
  }

  public getMainIcon(): string {
    const contract = this.coin.getContractAddress();
    const addr = contract ? contract.toLowerCase() : '';
    return PGPERC20SubWallet.TOKEN_ICON_MAP[addr] ?? 'assets/wallet/coins/pga.png';
  }

  public getSecondaryIcon(): string {
    return null;
  }

  public getDisplayableERC20TokenInfo(): string {
    return "";
  }

  public supportInternalTransactions() {
    return false;
  }

  private isELAToken() {
    let elaTokenAddress = (this.networkWallet.network as ElastosPGPNetworkBase).getELATokenContract();
    if (this.coin.getContractAddress() === elaTokenAddress) return true;

    return false;
  }

  public supportsCrossChainTransfers(): boolean {
    if (this.isELAToken()) {
      // Only wallets imported with mnemonic have cross chain capability because we then have both mainchain
      // and sidechains addresses.
      return this.networkWallet.masterWallet.hasMnemonicSupport()
    }
    else return false;
  }

  protected async getWithdrawContract() {
    if (!this.withdrawContract) {
      const contractAbi = [{
        "inputs": [
          {
            "internalType": "string",
            "name": "_addr",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_fee",
            "type": "uint256"
          }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const highPriorityWeb3 = await this.createWeb3(true);
      this.withdrawContract = new (highPriorityWeb3.eth.Contract)(contractAbi, this.withdrawContractAddress);
    }
    return await this.withdrawContract;
  }

  public async estimateWithdrawTransactionGas(toAddress: string) {
    const ethscWithdrawContract = await this.getWithdrawContract()

    const highPriorityWeb3 = await this.createWeb3(true);
    const method = ethscWithdrawContract.methods.withdraw(toAddress, '100000', Config.PGP_WITHDRAW_GASPRICE);

    let estimateGas = 3000000;
    try {
      // IMPORTANT: The withdraw method is nonpayable (ERC20 token withdraw), so we don't set "value" field.
      // We use the real token owner address because cost estimation works only when "from" actually owns tokens
      // and has approved the withdraw contract.
      const tokenAccountAddress = this.getTokenAccountAddress();
      let tx = {
        from: tokenAccountAddress,
        data: method.encodeABI(),
        to: this.withdrawContractAddress,
        // No "value" field - withdraw is nonpayable, it works with ERC20 tokens via transferFrom
      }
      let tempGasLimit = await highPriorityWeb3.eth.estimateGas(tx);
      // Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
      estimateGas = Util.ceil(tempGasLimit * 1.5, 100);

    } catch (error) {
        // Estimate may fail if allowance is not set or balance is insufficient.
        // This is expected and we fall back to the default gas limit.
        Logger.warn('wallet', 'pgp estimateWithdrawTransactionGas error (using default):', error);
    }

    return estimateGas;
  }

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string, gasPriceArg: string, gasLimitArg: string, nonceArg = -1): Promise<string> {
    const withdrawContract = await this.getWithdrawContract()
    let gasPrice = gasPriceArg;
    if (gasPrice === null) {
      gasPrice = await this.getGasPrice();
    }

    let gasLimit = gasLimitArg;
    if (gasLimit === null) {
      let estimateGas = await this.estimateWithdrawTransactionGas(toAddress);
      gasLimit = estimateGas.toString();
    }

    let amountWithDecimals: BigNumber;
    if (toAmount === -1) { //-1: send all.
      const crossChainFee = new BigNumber(10000);
      if (this.balance.lt(crossChainFee)) {
        // If the balance is less than the cross chain fee, return null
        return null;
      }
      amountWithDecimals = this.balance.minus(crossChainFee);
    } else {
      amountWithDecimals = new BigNumber(toAmount).multipliedBy(this.tokenAmountMulipleTimes);
    }

    // Incompatibility between our bignumber lib and web3's BN lib. So we must convert by using intermediate strings
    const highPriorityWeb3 = await this.createWeb3(true);
    const web3BigNumber = highPriorityWeb3.utils.toBN(amountWithDecimals.toString(10));
    const method = withdrawContract.methods.withdraw(toAddress, web3BigNumber, Config.PGP_WITHDRAW_GASPRICE);

    let nonce = nonceArg;
    if (nonce === -1) {
      nonce = await EVMService.instance.getNonce(this.networkWallet.network, this.networkWallet.getAddresses()[0].address);
    }
    Logger.log('wallet', 'pgp createWithdrawTransaction gasPrice:', gasPrice.toString(), ' toAmountSend:', amountWithDecimals.toString(), ' nonce:', nonce, ' withdrawContractAddress:', this.withdrawContractAddress);

    return (this.networkWallet.safe as unknown as EVMSafe).createContractTransaction(this.withdrawContractAddress, '0', gasPrice, gasLimit, nonce, method.encodeABI());
  }
}