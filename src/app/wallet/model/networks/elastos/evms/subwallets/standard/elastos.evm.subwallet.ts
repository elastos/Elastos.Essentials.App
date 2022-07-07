import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { Config } from '../../../../../../config/Config';
import { StandardCoinName } from '../../../../../coin';
import { ElastosMainChainWalletNetworkOptions } from '../../../../../masterwallets/wallet.types';
import { EthTransaction } from '../../../../evms/evm.types';
import { AnyEVMNetworkWallet } from '../../../../evms/networkwallets/evm.networkwallet';
import { EVMSafe } from '../../../../evms/safes/evm.safe';
import { MainCoinEVMSubWallet } from '../../../../evms/subwallets/evm.subwallet';

/**
 * Specialized standard sub wallet for EVM sidechains.
 */
export class ElastosEVMSubWallet extends MainCoinEVMSubWallet<ElastosMainChainWalletNetworkOptions> {
  constructor(networkWallet: AnyEVMNetworkWallet, id: StandardCoinName, friendlyName: string) {
    //let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(id);

    super(networkWallet, id, friendlyName);

    this.tokenDecimals = 18;
    this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
  }

  public supportsCrossChainTransfers(): boolean {
    // Only wallets imported with mnemonic have cross chain capability because we then have both mainchain
    // and sidechains addresses.
    return this.networkWallet.masterWallet.hasMnemonicSupport()
  }

  public getAverageBlocktime(): number {
    return 5;
  }

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(
      GlobalElastosAPIService.instance.getApiUrlForChainCode(this.id as StandardCoinName),
      txid);
    if (!result) {
      // Remove error transaction.
      // TODO await this.removeInvalidTransaction(txid);
    }
    return result;
  }

  /**
   * Use smartcontract to Send ELA from ETHSC to mainchain.
   */
  public getWithdrawContractAddress() {
    return this.withdrawContractAddress;
  }

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string, gasPriceArg: string, gasLimitArg: string, nonceArg = -1): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contractAbi = require("src/assets/wallet/ethereum/ETHSCWithdrawABI.json");
    const ethscWithdrawContract = new ((await this.getWeb3(true)).eth.Contract)(contractAbi, this.withdrawContractAddress);
    let gasPrice = gasPriceArg;
    if (gasPrice === null) {
      gasPrice = await this.getGasPrice();
    }

    let gasLimit = gasLimitArg;
    if (gasLimit === null) {
      gasLimit = '100000';
    }

    // Contract:
    //   unction receivePayload(string _addr, uint256 _amount, uint256 _fee) public payable {
    //     require(msg.value == _amount);
    //     require(_fee >= 100000000000000 && _fee % 10000000000 == 0);
    //     require(_amount % 10000000000 == 0 && _amount.sub(_fee) >= _fee);
    //     emit PayloadReceived(_addr, _amount, _amount.sub(_fee), msg.sender);
    //     emit EtherDeposited(msg.sender, msg.value, address(0));
    // }
    // condition: _amount % 10000000000 == 0 && _amount.sub(_fee) >= _fee
    if (toAmount === -1) {
      let balanceString = this.balance.toFixed()
      //amount % 10000000000 == 0
      let estimateAmount = balanceString.substring(0, balanceString.length - 10) + "0000000000"
      const method = ethscWithdrawContract.methods.receivePayload(toAddress, estimateAmount, Config.ETHSC_WITHDRAW_GASPRICE);
      let estimateGas = 0;
      try {
        // Can not use method.estimateGas(), must set the "value"
        let tx = {
          data: method.encodeABI(),
          to: this.withdrawContractAddress,
          value: estimateAmount,
        }
        estimateGas = await (await this.getWeb3(true)).eth.estimateGas(tx);
      } catch (error) {
        Logger.error('wallet', 'estimateGas error:', error);
        estimateGas = 28100;
      }

      gasLimit = estimateGas.toString();

      let fee = new BigNumber(estimateGas).multipliedBy(new BigNumber(gasPrice)).dividedBy(this.tokenAmountMulipleTimes);
      toAmount = this.balance.dividedBy(this.tokenAmountMulipleTimes).minus(fee).toNumber();
      if (toAmount <= 0)
        return null;
    }

    // _amount % 10000000000 == 0
    const amountTemp = toAmount.toFixed(9);
    const fixedAmount = amountTemp.substring(0, amountTemp.lastIndexOf('.') + 9)
    // TODO fixedAmount >= 0.0002 (_amount.sub(_fee) >= _fee)

    const toAmountSend = (await this.getWeb3(true)).utils.toWei(fixedAmount);
    const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);

    let nonce = nonceArg;
    if (nonce === -1) {
      nonce = await this.getNonce();
    }
    Logger.log('wallet', 'createWithdrawTransaction gasPrice:', gasPrice.toString(), ' toAmountSend:', toAmountSend, ' nonce:', nonce, ' withdrawContractAddress:', this.withdrawContractAddress);
    return (this.networkWallet.safe as unknown as EVMSafe).createContractTransaction(this.withdrawContractAddress, toAmountSend, gasPrice, gasLimit, nonce, method.encodeABI());
  }
}
