import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { jsToSpvWalletId, SPVService } from 'src/app/wallet/services/spv.service';
import { Config } from '../../../../../../config/Config';
import { StandardCoinName } from '../../../../../coin';
import { ElastosMainChainWalletNetworkOptions } from '../../../../../masterwallets/wallet.types';
import { AnyNetworkWallet } from '../../../../base/networkwallets/networkwallet';
import { EthTransaction } from '../../../../evms/evm.types';
import { MainCoinEVMSubWallet } from '../../../../evms/subwallets/evm.subwallet';

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ElastosEVMSubWallet extends MainCoinEVMSubWallet<ElastosMainChainWalletNetworkOptions> {
  constructor(networkWallet: AnyNetworkWallet, id: StandardCoinName, friendlyName: string) {
    let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(id);

    super(networkWallet, id, rpcApiUrl, friendlyName);

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
    const ethscWithdrawContract = new (this.getWeb3().eth.Contract)(contractAbi, this.withdrawContractAddress);
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
      const estimateAmount = this.getWeb3().utils.toWei(this.balance.toString());
      const method = ethscWithdrawContract.methods.receivePayload(toAddress, estimateAmount, Config.ETHSC_WITHDRAW_GASPRICE);
      let estimateGas = 0;
      try {
        // Can not use method.estimateGas(), must set the "value"
        let tx = {
          data: method.encodeABI(),
          to: this.withdrawContractAddress,
          value: estimateAmount,
        }
        estimateGas = await this.getWeb3().eth.estimateGas(tx);
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

    const toAmountSend = this.getWeb3().utils.toWei(fixedAmount.toString());
    const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);

    const data = method.encodeABI();

    let nonce = nonceArg;
    if (nonce === -1) {
      nonce = await this.getNonce();
    }
    Logger.log('wallet', 'createWithdrawTransaction gasPrice:', gasPrice.toString(), ' toAmountSend:', toAmountSend, ' nonce:', nonce, ' withdrawContractAddress:', this.withdrawContractAddress);
    return SPVService.instance.createTransferGeneric(
      jsToSpvWalletId(this.masterWallet.id),
      this.id,
      this.withdrawContractAddress,
      toAmountSend,
      0, // WEI
      gasPrice,
      0, // WEI
      gasLimit,
      data,
      nonce
    );
  }
}
