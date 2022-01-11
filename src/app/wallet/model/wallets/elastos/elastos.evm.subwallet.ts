import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { Config } from '../../../config/Config';
import { StandardCoinName } from '../../coin';
import { EthTransaction } from '../../evm.types';
import { WalletCreateType } from '../../walletaccount';
import { StandardEVMSubWallet } from '../evm.subwallet';
import { NetworkWallet } from '../networkwallet';

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ElastosEVMSubWallet extends StandardEVMSubWallet {
  constructor(networkWallet: NetworkWallet, id: StandardCoinName) {
    let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(id);

    super(networkWallet, id, rpcApiUrl, ElastosEVMSubWallet.getFriendlyName(id));

    void this.initialize();

    this.tokenDecimals = 18;
    this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
  }

  public supportsCrossChainTransfers(): boolean {
    // The wallet that imported by private key has no ELA mainchain.
    return this.networkWallet.masterWallet.createType === WalletCreateType.MNEMONIC;
  }

  public getMainIcon(): string {
    switch (this.id) {
      case StandardCoinName.ETHDID:
        return "assets/wallet/coins/ela-turquoise.svg";
      case StandardCoinName.ETHSC:
        return "assets/wallet/coins/ela-gray.svg";
      default:
        return null;
    }
  }

  public getSecondaryIcon(): string {
    return null;
  }

  public static getFriendlyName(coinId: string): string {
    if (coinId === StandardCoinName.ETHSC)
      return "Smart Chain";
    else if (coinId === StandardCoinName.ETHDID)
      return "Identity Chain";
    else
      return "";
  }

  public getFriendlyName(): string {
    return ElastosEVMSubWallet.getFriendlyName(this.id);
  }

  public getDisplayTokenName(): string {
    if (this.id === StandardCoinName.ETHSC)
      return "ELA";
    else if (this.id === StandardCoinName.ETHDID)
      return "ELA";
    else
      return "";
  }

  public getAverageBlocktime(): number {
    return 5;
  }

  /* protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getTransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                if (transaction.transferType === ETHSCTransferType.DEPOSIT) {
                  return "wallet.coin-dir-from-mainchain";
                } else {
                  return "wallet.coin-op-received-token";
                }
            case TransactionDirection.SENT:
                return this.getETHSCTransactionContractType(transaction, translate);
        }
        return null;
    } */

  /* protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
    let transactionName = '';
    // Logger.log("wallet", "getTransactionName std subwallet", transaction);

    switch (transaction.type) {
      case TransactionDirection.RECEIVED:
        transactionName = 'wallet.coin-op-received-token';
        // TODO: Show right info for others txtype.
        switch (transaction.txtype) {
          case RawTransactionType.RechargeToSideChain:
            transactionName = "wallet.coin-dir-from-mainchain";
            break;
          case RawTransactionType.WithdrawFromSideChain:
            switch (transaction.inputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-ethsc";
                break;
              default:
                transactionName = 'wallet.coin-op-received-token';
            }
            break;
          case RawTransactionType.ReturnDepositCoin:
            transactionName = "wallet.coin-op-producer-return";
            break;
          case RawTransactionType.ReturnCRDepositCoin:
            transactionName = "wallet.coin-op-cr-return";
            break;
          case RawTransactionType.CrcProposalWithdraw:
            transactionName = "wallet.coin-op-proposal-withdraw";
            break;
        }
        break;
      case TransactionDirection.SENT:
        transactionName = "wallet.coin-op-sent-token";
        switch (transaction.txtype) {
          case RawTransactionType.TransferCrossChainAsset:
            switch (transaction.outputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-ethsc";
                break;
              default:
                transactionName = "wallet.coin-dir-to-mainchain";
                break;
            }
            break;
          case RawTransactionType.RegisterProducer:
            transactionName = "wallet.coin-op-producer-register";
            break;
          case RawTransactionType.RegisterCR:
            transactionName = "wallet.coin-op-cr-register";
            break;
        }
        break;
      case TransactionDirection.MOVED:
        transactionName = "wallet.coin-op-transfered-token";
        break;
    }
    return await transactionName;
  } */

  /*  protected async getTransactionIconPath(transaction: ElastosTransaction): Promise<string> {
     if (transaction.type === TransactionDirection.RECEIVED) {
       switch (transaction.txtype) {
         case RawTransactionType.RechargeToSideChain:
         case RawTransactionType.WithdrawFromSideChain:
         case RawTransactionType.TransferCrossChainAsset:
           return await './assets/wallet/buttons/transfer.png';
         default:
           return await './assets/wallet/buttons/receive.png';
       }
     } else if (transaction.type === TransactionDirection.SENT) {
       switch (transaction.txtype) {
         case RawTransactionType.RechargeToSideChain:
         case RawTransactionType.WithdrawFromSideChain:
         case RawTransactionType.TransferCrossChainAsset:
           return await './assets/wallet/buttons/transfer.png';
         default:
           return await './assets/wallet/buttons/send.png';
       }
     } else if (transaction.type === TransactionDirection.MOVED) {
       return await './assets/wallet/buttons/transfer.png';
     }

     return null;
   } */

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
    const contractAbi = require("../../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
    const ethscWithdrawContract = new this.web3.eth.Contract(contractAbi, this.withdrawContractAddress);
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
      const estimateAmount = this.web3.utils.toWei(this.balance.toString());
      const method = ethscWithdrawContract.methods.receivePayload(toAddress, estimateAmount, Config.ETHSC_WITHDRAW_GASPRICE);
      let estimateGas = 0;
      try {
        // Can not use method.estimateGas(), must set the "value"
        let tx = {
          data: method.encodeABI(),
          to: this.withdrawContractAddress,
          value: estimateAmount,
        }
        estimateGas = await this.web3.eth.estimateGas(tx);
      } catch (error) {
        Logger.error('wallet', 'estimateGas error:', error);
        estimateGas = 28100; //In case of
      }

      gasLimit = estimateGas.toString();

      let fee = new BigNumber(estimateGas).multipliedBy(new BigNumber(gasPrice)).dividedBy(this.tokenAmountMulipleTimes);
      toAmount = this.balance.dividedBy(this.tokenAmountMulipleTimes).minus(fee).toNumber();
      if (toAmount <= 0) return null;
    }

    // _amount % 10000000000 == 0
    const amountTemp = toAmount.toFixed(9);
    const fixedAmount = amountTemp.substring(0, amountTemp.lastIndexOf('.') + 9)
    // TODO fixedAmount >= 0.0002 (_amount.sub(_fee) >= _fee)

    const toAmountSend = this.web3.utils.toWei(fixedAmount.toString());
    const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);

    const data = method.encodeABI();

    let nonce = nonceArg;
    if (nonce === -1) {
        nonce = await this.getNonce();
    }
    Logger.log('wallet', 'createWithdrawTransaction gasPrice:', gasPrice.toString(), ' toAmountSend:', toAmountSend, ' nonce:', nonce, ' withdrawContractAddress:', this.withdrawContractAddress);
    return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
      this.masterWallet.id,
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
