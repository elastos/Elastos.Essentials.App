import BigNumber from 'bignumber.js';
import { GlobalRedPacketServiceAddresses } from 'src/app/config/globalconfig';
import { TranslationService } from 'src/app/identity/services/translation.service';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { BridgeService } from 'src/app/wallet/services/evm/bridge.service';
import { EarnService } from 'src/app/wallet/services/evm/earn.service';
import { SwapService } from 'src/app/wallet/services/evm/swap.service';
import type Web3 from 'web3';
import { ERC20CoinService } from '../../../../services/evm/erc20coin.service';
import { EVMService } from '../../../../services/evm/evm.service';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { ETHTransactionInfoParser } from '../ethtransactioninfoparser';
import type { EVMNetwork } from '../evm.network';
import { ERC20TokenTransactionInfo, ERCTokenInfo, EthTokenTransaction, EthTransaction } from '../evm.types';
import { EVMNetworkWallet } from '../networkwallets/evm.networkwallet';
import { EVMSafe } from '../safes/evm.safe';
import type { ERC20SubWallet } from './erc20.subwallet';

/**
 * Specialized sub wallet for EVM compatible chains main coins (elastos EID, elastos ESC, heco, etc)
 */
export class MainCoinEVMSubWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends MainCoinSubWallet<EthTransaction, WalletNetworkOptionsType> {
  protected ethscAddress: string = null;
  protected withdrawContractAddress: string = null;
  protected publishdidContractAddress: string = null;
  protected tokenList: ERCTokenInfo[] = null;
  private redPacketServerAddress = null;
  protected txInfoParser: ETHTransactionInfoParser;

  constructor(
    public networkWallet: EVMNetworkWallet<any, WalletNetworkOptionsType>,
    id: string,
    protected friendlyName: string
  ) {
    super(networkWallet, id);

    void this.initialize();
  }

  public async initialize(): Promise<void> {
    await super.initialize();

    this.txInfoParser = new ETHTransactionInfoParser(this.networkWallet.network);

    this.tokenDecimals = 18;
    this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
    // this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");

    this.redPacketServerAddress = GlobalRedPacketServiceAddresses[this.id];
  }

  public async startBackgroundUpdates(): Promise<void> {
    await super.startBackgroundUpdates();

    setTimeout(() => {
      void this.updateBalance();
    }, 2000);

    return;
  }

  public getAvailableEarnProviders(): EarnProvider[] {
    return EarnService.instance.getAvailableEarnProviders(this);
  }

  public getAvailableSwapProviders(): SwapProvider[] {
    return SwapService.instance.getAvailableSwapProviders(this);
  }

  public getAvailableBridgeProviders(): BridgeProvider[] {
    return BridgeService.instance.getAvailableBridgeProviders(this);
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

  public async getTokenAddress(usage: (AddressUsage | string) = AddressUsage.EVM_CALL): Promise<string> {
    if (!this.ethscAddress) {
      this.ethscAddress = (await this.getCurrentReceiverAddress(usage)).toLowerCase();
    }
    return this.ethscAddress;
  }

  public getWeb3(): Promise<Web3> {
    return EVMService.instance.getWeb3(this.networkWallet.network as EVMNetwork);
  }

  protected getNetwork(): EVMNetwork {
    return this.networkWallet.network as EVMNetwork;
  }

  public async createAddress(): Promise<string> {
    // Create on EVM networks always returns the same unique address.
    let addresses = await this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.EVM_CALL);
    return (addresses && addresses[0]) ? addresses[0] : null;
  }

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(this.getNetwork().getRPCUrl(), txid, this.networkWallet.network.key);
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

  public async getTransactionInfo(transaction: EthTransaction): Promise<TransactionInfo> {
    // There is no blockHash in the internal transactions.
    if (transaction.hide || (transaction.blockHash === null) || (transaction.isError && transaction.isError != '0')) {
      return null;
    }

    // Not blocking retrieval of extended transaction information
    void this.networkWallet.getOrFetchExtendedTxInfo(transaction.hash).then(async extInfo => {
      // Got a partial info, now compute more things (main contract operation type, events...) then save
      if (extInfo && extInfo.evm.transactionReceipt && !extInfo.evm.txInfo) {
        extInfo.evm.txInfo = await this.txInfoParser.computeFromTxReceipt(extInfo.evm.transactionReceipt, transaction.input, this);
        await this.networkWallet.saveExtendedTxInfo(transaction.hash, extInfo);
      }

      // console.log('extendedTxInfo', extInfo, transaction);
    });

    transaction.to = transaction.to.toLowerCase();

    const timestamp = parseInt(transaction.timeStamp) * 1000; // Convert seconds to use milliseconds
    const datetime = timestamp === 0 ? TranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

    const direction = await this.getTransactionDirection(transaction.to);
    transaction.Direction = direction;

    if (direction === TransactionDirection.RECEIVED) {
      this.checkRedPacketTransaction(transaction);
    }

    const isERC20TokenTransfer = await this.isERC20TokenTransfer(transaction.to);
    transaction.isERC20TokenTransfer = isERC20TokenTransfer;
    let erc20TokenTransactionInfo: ERC20TokenTransactionInfo = null;
    if (isERC20TokenTransfer) {
      erc20TokenTransactionInfo = await this.getERC20TokenTransactionInfo(transaction)
    }

    const transactionInfo: TransactionInfo = {
      amount: new BigNumber(-1),
      confirmStatus: parseInt(transaction.confirmations),
      datetime,
      direction: direction,
      fee: '0',
      height: parseInt(transaction.blockNumber),
      memo: '',
      name: await this.getTransactionName(transaction),
      payStatusIcon: await this.getTransactionIconPath(transaction),
      status: TransactionStatus.UNCONFIRMED, // TODO @zhiming: was: transaction.Status,
      statusName: "TODO", // TODO @zhiming: was: this.getTransactionStatusName(transaction.Status, translate),
      symbol: '',
      from: transaction.from,
      to: isERC20TokenTransfer ? erc20TokenTransactionInfo.to : transaction.to,
      timestamp,
      txid: transaction.hash,
      type: null,
      isCrossChain: false,
      erc20TokenSymbol: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenSymbol : null,
      erc20TokenValue: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenValue : null,
      erc20TokenContractAddress: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenContractAddress : null,
      isRedPacket: transaction.isRedPacket,
      subOperations: []
    };

    transactionInfo.amount = new BigNumber(transaction.value).dividedBy(this.tokenAmountMulipleTimes);
    transactionInfo.fee = new BigNumber(transaction.gasUsed).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(this.tokenAmountMulipleTimes).toFixed();

    if (transactionInfo.confirmStatus !== 0) {
      transactionInfo.status = TransactionStatus.CONFIRMED;
      transactionInfo.statusName = TranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
    } else {
      transactionInfo.status = TransactionStatus.PENDING;
      transactionInfo.statusName = TranslationService.instance.translateInstant("wallet.coin-transaction-status-pending");
    }

    // MESSY again - No "Direction" field in ETH transactions (contrary to other chains). Calling a private method to determine this.
    if (direction === TransactionDirection.RECEIVED) {
      transactionInfo.type = TransactionType.RECEIVED;
      transactionInfo.symbol = '+';
    } else if (direction === TransactionDirection.SENT) {
      transactionInfo.type = TransactionType.SENT;
      transactionInfo.symbol = '-';
    } else if (direction === TransactionDirection.MOVED) {
      transactionInfo.type = TransactionType.TRANSFER;
      transactionInfo.symbol = '';
    }

    return transactionInfo;
  }

  protected async getTransactionName(transaction: EthTransaction): Promise<string> {
    const direction = transaction.Direction ? transaction.Direction : await this.getTransactionDirection(transaction.to);
    switch (direction) {
      case TransactionDirection.RECEIVED:
        return "wallet.coin-op-received-token";
      case TransactionDirection.SENT:
        return this.getETHSCTransactionContractType(transaction);
    }
    return null;
  }

  protected async getTransactionIconPath(transaction: EthTransaction): Promise<string> {
    const direction = transaction.Direction ? transaction.Direction : await this.getTransactionDirection(transaction.to);
    switch (direction) {
      case TransactionDirection.RECEIVED:
        if (transaction.isRedPacket) {
          return './assets/redpackets/images/default-avatar.png';
        } else {
          return './assets/wallet/buttons/receive.png';
        }
      case TransactionDirection.SENT:
        return './assets/wallet/buttons/send.png';
    }
  }

  protected async getTransactionDirection(targetAddress: string): Promise<TransactionDirection> {
    const address = await this.getTokenAddress();
    if (address === targetAddress) {
      return TransactionDirection.RECEIVED;
    } else {
      return TransactionDirection.SENT;
    }
  }

  private checkRedPacketTransaction(transaction: EthTransaction) {
    if (transaction.from.toLowerCase() === this.redPacketServerAddress) {
      transaction.isRedPacket = true;
    } else {
      transaction.isRedPacket = false;
    }
  }

  protected isERC20TokenTransfer(toAddress: string) {
    if (this.tokenList == null) return false;

    for (let i = 0, len = this.tokenList.length; i < len; i++) {
      if (this.tokenList[i].contractAddress.toLowerCase() === toAddress) {
        return true;
      }
    }
    return false;
  }

  protected async getERC20TokenTransactionInfo(transaction: EthTransaction): Promise<ERC20TokenTransactionInfo> {
    let contractAddress = transaction.to;
    let toAddress = null, erc20TokenSymbol = null, erc20TokenValue = null;
    const erc20Coin = this.networkWallet.network.getERC20CoinByContractAddress(contractAddress);
    if (erc20Coin) {// erc20Coin is true normally.
      erc20TokenSymbol = erc20Coin.getName();
      // Get transaction from erc20 token subwallet.
      let erc20Subwallet: ERC20SubWallet = (this.networkWallet.getSubWallet(erc20Coin.getID()) as ERC20SubWallet);
      if (erc20Subwallet) {
        let erc20Tansaction: EthTokenTransaction = await erc20Subwallet.getTransactionByHash(transaction.hash) as EthTokenTransaction;
        if (erc20Tansaction) {
          toAddress = erc20Tansaction.to;
          erc20TokenValue = erc20Subwallet.getDisplayValue(erc20Tansaction.value).toFixed();
        }
      }
    }

    if (!toAddress) {
      toAddress = transaction.to;
      contractAddress = null;
    }

    return { to: toAddress, tokenContractAddress: contractAddress, tokenSymbol: erc20TokenSymbol, tokenValue: erc20TokenValue }
  }

  protected getETHSCTransactionContractType(transaction: EthTransaction): string {
    let toAddressLowerCase = transaction.to.toLowerCase();

    if (transaction.isERC20TokenTransfer) {
      return "wallet.coin-op-contract-token-transfer";
    } else if (toAddressLowerCase === this.withdrawContractAddress) {
      // withdraw to MainChain
      return "wallet.coin-dir-to-mainchain";
    } else if ((this.id === StandardCoinName.ETHDID) && (toAddressLowerCase === this.publishdidContractAddress)) {
      // publish did
      return "wallet.coin-op-identity";
    } else if (toAddressLowerCase === '') {
      return "wallet.coin-op-contract-create";
    } else if (toAddressLowerCase === '0x0000000000000000000000000000000000000000') {
      return "wallet.coin-op-contract-destroy";
    } else if (transaction.value !== '0') {
      return "wallet.coin-op-sent-token";
    } else {
      return "wallet.coin-op-contract-call";
    }
  }

  protected async getBalanceByWeb3(): Promise<BigNumber> {
    const address = await this.getTokenAddress();
    try {
      const balanceString = await (await this.getWeb3()).eth.getBalance(address);
      return new BigNumber(balanceString);
    }
    catch (e) {
      Logger.error('wallet', 'getBalanceByWeb3 exception:', e);
      return new BigNumber(NaN);
    }
  }

  public async update() {
    await this.updateBalance();
  }

  public async updateBalance(): Promise<void> {
    // this.balance = await this.getBalanceByWeb3();
    const address = await this.getTokenAddress();
    const balance = await GlobalEthereumRPCService.instance.eth_getBalance(this.getNetwork().getRPCUrl(), address, this.networkWallet.network.key);
    if (balance) {
      this.balance = balance;
      await this.saveBalanceToCache();
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
    toAddress = this.networkWallet.convertAddressForUsage(toAddress, AddressUsage.EVM_CALL);

    let gasPrice = gasPriceArg;
    if (gasPrice === null) {
      gasPrice = await this.getGasPrice();
      //   gasPrice = '900000000';
    }

    let gasLimit = gasLimitArg;
    if (gasLimit === null) {
      // gasLimit = '100000';
      let estimateGas = await this.estimateGasForPaymentTransaction(toAddress, '0x186a0111');
      if (estimateGas === -1) {
        Logger.warn('wallet', 'createPaymentTransaction can not estimate gas');
        return null;
      }
      if (amount.eq(-1)) {
        // TODO: User will lost small amount if use 'estimateGas * 1.5'.
        gasLimit = estimateGas.toString();
      } else {
        // '* 1.5':Make sue the gaslimit is big enough.
        gasLimit = Util.ceil(estimateGas * 1.5).toString();
      }
    }

    if (amount.eq(-1)) {//-1: send all.
      let fee = new BigNumber(gasLimit).multipliedBy(new BigNumber(gasPrice))
      amount = this.balance.minus(fee).dividedBy(this.tokenAmountMulipleTimes);
      if (amount.lte(0))
        return null;
    }

    let nonce = nonceArg;
    if (nonce === -1) {
      nonce = await this.getNonce();
    }
    Logger.log('wallet', 'createPaymentTransaction amount:', amount.toFixed(), ' nonce:', nonce)

    return (this.networkWallet.safe as unknown as EVMSafe).createTransferTransaction(toAddress, amount.toFixed(), gasPrice, gasLimit, nonce);
  }

  public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    return Promise.resolve([]);
  }

  public publishTransaction(signedTransaction: string): Promise<string> {
    return EVMService.instance.publishTransaction(this, signedTransaction, null);
  }

  /**
   * Returns the current gas price on chain.
   */
  public async getGasPrice(): Promise<string> {
    const gasPrice = await (await this.getWeb3()).eth.getGasPrice();
    //Logger.log('wallet', "GAS PRICE: ", gasPrice)
    return gasPrice;
  }

  public async getNonce() {
    const address = await this.getTokenAddress();
    try {
      return GlobalEthereumRPCService.instance.getETHSCNonce(this.getNetwork().getRPCUrl(), address, this.networkWallet.network.key);
    }
    catch (err) {
      Logger.error('wallet', 'getNonce failed, ', this.id, ' error:', err);
    }
    return -1;
  }

  public async estimateGas(tx): Promise<number> {
    let gasLimit = await (await this.getWeb3()).eth.estimateGas(tx);
    return gasLimit;
  }

  // value is hexadecimal string, eg: "0x1000"
  private async estimateGasForPaymentTransaction(to: string, value: string) {
    try {
      const address = await this.getTokenAddress();
      return await GlobalEthereumRPCService.instance.eth_estimateGas(this.getNetwork().getRPCUrl(), address, to, value, this.networkWallet.network.key);
    }
    catch (err) {
      Logger.error('wallet', 'estimateGasForPaymentTransaction failed, ', this.id, ' error:', err);
    }
    return -1;
  }

  /**
   * Estimated cost of a native coin transfer, in readable native coin amount.
   */
  public estimateTransferTransactionFees(): Promise<BigNumber> {
    return EVMService.instance.estimateTransferTransactionFees(this.getNetwork());
  }

  /**
   * Estimated cost in native coin readable amount, of a ERC20 transfer cost.
   */
  public async estimateERC20TransferTransactionFees(tokenAddress: string): Promise<BigNumber> {
    let senderAddress = await this.getCurrentReceiverAddress();
    return ERC20CoinService.instance.estimateERC20TransferTransactionFees(tokenAddress, senderAddress, this.getNetwork());
  }

  /*protected async removeInvalidTransaction(hash: string) {
    let existingIndex = (this.paginatedTransactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
    if (existingIndex >= 0) {
      Logger.warn('wallet', 'Find invalid transaction, remove it ', hash);
      this.paginatedTransactions.txhistory.splice(existingIndex, 1);
      this.paginatedTransactions.totalcount--;

      this.transactionsCache.remove(hash);
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
      await this.transactionsCache.save();
    }
  } */
}

export class AnyMainCoinEVMSubWallet extends MainCoinEVMSubWallet<any> { }