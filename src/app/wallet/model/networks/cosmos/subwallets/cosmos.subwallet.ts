import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { CosmosTransaction } from '../../../cosmos.types';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { GenericTransaction, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { CosmosNetwork } from '../cosmos.network';
import { CosmosNetworkWallet } from '../networkwallets/cosmos.networkwallet';
import { CosmosSafe } from '../safes/cosmos.safe';

/**
 * Specialized sub wallet for cosmos compatible chains main coins
 */
export class MainCoinCosmosSubWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinSubWallet<GenericTransaction, WalletNetworkOptionsType> {
  protected ethscAddress: string = null;
  protected withdrawContractAddress: string = null;
  protected publishdidContractAddress: string = null;

  constructor(
    public networkWallet: CosmosNetworkWallet<any, WalletNetworkOptionsType>,
    id: string,
    protected friendlyName: string
  ) {
    super(networkWallet, id);

    void this.initialize();
  }

  public async initialize(): Promise<void> {
    await super.initialize();


    this.tokenDecimals = 6;
    this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
  }

  public async startBackgroundUpdates(): Promise<void> {
    await super.startBackgroundUpdates();

    setTimeout(() => {
      void this.updateBalance();
    }, 2000);

    return;
  }

  public getMainIcon(): string {
    return this.networkWallet.network.logo;
  }

  public getSecondaryIcon(): string {
    return null
  }

  public getFriendlyName(): string {
    return this.friendlyName;
  }

  public getDisplayTokenName(): string {
    return this.networkWallet.network.getMainTokenSymbol();
  }

  public isAddressValid(address: string): Promise<boolean> {
    return WalletUtil.isEVMAddress(address);
  }

  public getAccountAddress(usage: (AddressUsage | string) = AddressUsage.EVM_CALL): string {
    if (!this.ethscAddress) {
      this.ethscAddress = this.getCurrentReceiverAddress(usage)?.toLowerCase();
    }
    return this.ethscAddress;
  }

  protected getNetwork(): CosmosNetwork {
    return this.networkWallet.network as CosmosNetwork;
  }

  public createAddress(): string {
    // Create on cosmos networks always returns the same unique address.
    let addresses = this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.EVM_CALL);
    return (addresses && addresses[0]) ? addresses[0] : null;
  }

  public async getTransactionDetails(txid: string): Promise<CosmosTransaction> {
    return null;
  }

  public async getTransactionInfo(transaction: CosmosTransaction): Promise<TransactionInfo> {
    const timestamp = transaction.timestamp ? transaction.timestamp : 0;
    const datetime = timestamp === 0 ? GlobalTranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

    const transactionInfo: TransactionInfo = {
      amount: new BigNumber(-1),
      confirmStatus: -1,
      datetime,
      direction: transaction.direction,
      fee: '0',
      height: transaction.height,
      memo: '',
      name: await this.getTransactionName(transaction),
      payStatusIcon: await this.getTransactionIconPath(transaction),
      status: TransactionStatus.UNCONFIRMED,
      statusName: "TODO",
      symbol: '',
      from: transaction.from,
      to: transaction.to,
      timestamp,
      txid: transaction.hash,
      type: null,
      isCrossChain: false,
      subOperations: []
    };

    transactionInfo.amount = await this.getTransactionAmount(transaction);

    if (transaction.fee) {
      transactionInfo.fee = new BigNumber(transaction.fee).dividedBy(this.tokenAmountMulipleTimes).toFixed();
    }

    if (transactionInfo.confirmStatus !== 0) {
      transactionInfo.status = TransactionStatus.CONFIRMED;
      transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
    } else {
      transactionInfo.status = TransactionStatus.PENDING;
      transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-pending");
    }

    // MESSY again - No "Direction" field in ETH transactions (contrary to other chains). Calling a private method to determine this.
    if (transaction.direction === TransactionDirection.RECEIVED) {
      transactionInfo.type = TransactionType.RECEIVED;
      transactionInfo.symbol = '+';
    } else if (transaction.direction === TransactionDirection.SENT) {
      transactionInfo.type = TransactionType.SENT;
      transactionInfo.symbol = '-';
    } else if (transaction.direction === TransactionDirection.MOVED) {
      transactionInfo.type = TransactionType.TRANSFER;
      transactionInfo.symbol = '';
    }

    return transactionInfo;
  }

  protected async getTransactionAmount(transaction: CosmosTransaction): Promise<BigNumber> {
    // Use extended info is there is some
    // let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.hash);
    // if (extInfo && extInfo.evm && extInfo.evm.txInfo && extInfo.evm.txInfo.operation) {
    //   if (extInfo.evm.txInfo.type === ETHOperationType.SWAP) {
    //     let operation = extInfo.evm.txInfo.operation as SwapExactTokensOperation;
    //     if (operation.type === TransactionType.RECEIVED) {
    //       // Get the amount from extended info.
    //       return new BigNumber(operation.amountOut).dividedBy(this.tokenAmountMulipleTimes);
    //     }
    //   }
    // }

    return new BigNumber(transaction.value).dividedBy(this.tokenAmountMulipleTimes);
  }

  protected async getTransactionName(transaction: CosmosTransaction): Promise<string> {
    // Use extended info is there is some
    // let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.hash);
    // if (extInfo && extInfo.evm && extInfo.evm.txInfo && extInfo.evm.txInfo.operation)
    //   return GlobalTranslationService.instance.translateInstant(extInfo.evm.txInfo.operation.description, extInfo.evm.txInfo.operation.descriptionTranslationParams);

    switch (transaction.direction) {
      case TransactionDirection.RECEIVED:
        return "wallet.coin-op-received-token";
      case TransactionDirection.SENT:
        return "wallet.coin-op-sent-token";
    }
    return null;
  }

  protected async getTransactionIconPath(transaction: CosmosTransaction): Promise<string> {
    switch (transaction.direction) {
      case TransactionDirection.RECEIVED:
          return './assets/wallet/tx/receive.svg';
      case TransactionDirection.SENT:
          return './assets/wallet/tx/send.svg';
    }
  }

  private isCrossChain(transaction: CosmosTransaction) {
    // let toAddressLowerCase = transaction.to.toLowerCase();
    // if (toAddressLowerCase === this.withdrawContractAddress) {
    //   transaction.isCrossChain = true;
    //   return true;
    // }

    return false;
  }

  public async update() {
    await this.updateBalance();
  }

  public async updateBalance(): Promise<void> {
    const balance = await (this.networkWallet.safe as unknown as CosmosSafe).getAllBalance();
    Logger.warn(App.WALLET, 'cosmos.subwallet balance', balance, this.networkWallet.masterWallet.name);
    if (balance && (balance.length > 0)) {
        // TODO: other asset?
        let atom = balance.find( (co) => co.denom == 'uatom');
        if (atom) {
            this.balance = new BigNumber(atom.amount);
            await this.saveBalanceToCache();
        } else {
            this.balance = new BigNumber(0);
        }
    } else {
        this.balance = new BigNumber(0);
    }
  }

  /**
   * Check whether the available balance is enough.
   * @param amount
   */
  public isAvailableBalanceEnough(amount: BigNumber) {
    return this.balance.gt(amount);
  }

  public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo: string, gasPriceArg: string = null, gasLimitArg: string = null, nonceArg = -1): Promise<string> {
    toAddress = await this.networkWallet.convertAddressForUsage(toAddress, AddressUsage.EVM_CALL);

    return null;
    // if (amount.eq(-1)) {//-1: send all.
    //   let fee = new BigNumber(gasLimit).multipliedBy(new BigNumber(gasPrice))
    //   amount = this.balance.minus(fee);
    //   if (amount.lte(0))
    //     return null;
    // } else {
    //   amount = amount.multipliedBy(this.tokenAmountMulipleTimes);
    // }

    // return (this.networkWallet.safe as unknown as CosmosSafe).createTransferTransaction(toAddress, amount.toFixed(), gasPrice, gasLimit, nonce);
  }

  public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return Promise.resolve([]);
  }

  public async publishTransaction(signedTransaction: string, visualFeedback = true): Promise<string> {
    return await 'todo';
  }

  public async estimateGas(tx): Promise<number> {
    return 0;
    // let gasLimit = await (await this.getWeb3(true)).eth.estimateGas(tx);
    // return gasLimit;
  }

  public async estimateTransferTransactionGas() {
    let gasLimit = 100000;// Default value
    // try {
    //     const address = await this.getAccountAddress();
    //     let tempGasLimit = await GlobalEthereumRPCService.instance.eth_estimateGas(this.getNetwork().getRPCUrl(), address, address, '0x186a0111', this.networkWallet.network.key);
    //     gasLimit = Util.ceil(tempGasLimit * 1.5, 100);
    // }
    // catch (e) {
    //     Logger.warn('wallet', 'Failed to eth_estimateGas:', e);
    // }
    return gasLimit
  }

  /**
   * Estimated cost of a native coin transfer, in readable native coin amount.
   */
  public estimateTransferTransactionFees(): Promise<BigNumber> {
    throw new Error("Method not implemented.");
  }

  /**
   * Estimated cost in native coin readable amount, of a ERC20 transfer cost.
   */
  public estimateERC20TransferTransactionFees(tokenAddress: string): Promise<BigNumber> {
    throw new Error("Method not implemented.");
  }

}

export class AnyMainCoinCosmosSubWallet extends MainCoinCosmosSubWallet<any> { }