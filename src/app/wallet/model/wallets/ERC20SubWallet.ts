import Web3 from 'web3';

import { MasterWallet } from './MasterWallet';
import { SubWallet, SerializedSubWallet, RawTransactionPublishResult } from './SubWallet';
import { CoinType, CoinID, Coin, ERC20Coin, StandardCoinName } from '../Coin';
import { Transfer } from '../../services/cointransfer.service';
import BigNumber from 'bignumber.js';
import { TranslateService } from '@ngx-translate/core';
import { AllTransactionsHistory, EthTransaction, SignedETHSCTransaction, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../Transaction';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { Config } from '../../config/Config';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

export class ERC20SubWallet extends SubWallet {
    /** Coin related to this wallet */
    private coin: ERC20Coin;
    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc20ABI: any;
    private tokenDecimals: number;
    private tokenAmountMulipleTimes: BigNumber; // 10 ^ tokenDecimal

    private tokenAddress = '';

    public static newFromCoin(masterWallet: MasterWallet, coin: Coin): Promise<ERC20SubWallet> {
        const subWallet = new ERC20SubWallet(masterWallet, coin.getID());
        return Promise.resolve(subWallet);
    }

    public static newFromSerializedSubWallet(masterWallet: MasterWallet, serializedSubWallet: SerializedSubWallet): ERC20SubWallet {
        Logger.log('wallet', "Initializing ERC20 subwallet from serialized sub wallet", serializedSubWallet);
        if (!serializedSubWallet.id) {
            Logger.log('wallet', 'newFromSerializedSubWallet id is null');
            return null;
        }
        const coin = masterWallet.coinService.getCoinByID(serializedSubWallet.id) as ERC20Coin;
        if (coin) {
            const subWallet = new ERC20SubWallet(masterWallet, serializedSubWallet.id);
            // subWallet.initFromSerializedSubWallet(serializedSubWallet);
            return subWallet;
        } else {
            Logger.error('wallet', 'newFromSerializedSubWallet error, this coin is not in coinService');
            return null;
        }
    }

    constructor(masterWallet: MasterWallet, id: CoinID) {
        super(masterWallet, id, CoinType.ERC20);

        void this.initialize();
    }

    private async initialize() {
        this.coin = this.masterWallet.coinService.getCoinByID(this.id) as ERC20Coin;
        // Get Web3 and the ERC20 contract ready
        const trinityWeb3Provider = new EssentialsWeb3Provider(ElastosApiUrlType.ETHSC_RPC);
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");

        // First retrieve the number of decimals used by this token. this is needed for a good display,
        // as we need to convert the balance integer using the number of decimals.
        await this.fetchTokenDecimals();

        await this.loadTransactionsFromCache();

        runDelayed(() => this.updateBalance(), 5000);
    }

    public async createAddress(): Promise<string> {
        // Create on ETH always returns the same unique address.
        return await this.masterWallet.walletManager.spvBridge.createAddress(this.masterWallet.id, StandardCoinName.ETHSC);
    }

    private async getTokenAccountAddress(): Promise<string> {
        if (!this.tokenAddress) {
            this.tokenAddress = (await this.createAddress()).toLowerCase();
        }
        return this.tokenAddress;
    }

    public getFriendlyName(): string {
        const coin = this.masterWallet.coinService.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getDescription();
    }

    public getDisplayTokenName(): string {
        const coin = this.masterWallet.coinService.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getName();
    }

    /**
     * Tries to retrieve the token decimals from local cache if we saved this earlier.
     * Otherwise, fetches it from chain.
     */
    private async fetchTokenDecimals(): Promise<void> {
        // Check cache
        let tokenCacheKey = this.masterWallet.id + this.coin.getContractAddress();
        this.tokenDecimals = await GlobalStorageService.instance.getSetting(GlobalDIDSessionsService.signedInDIDString, "wallet", tokenCacheKey, null);

        if (this.tokenDecimals === null) {
            try {
                const tokenAccountAddress = await this.getTokenAccountAddress();
                const contractAddress = this.coin.getContractAddress();
                const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });
                this.tokenDecimals = await erc20Contract.methods.decimals().call();
                await GlobalStorageService.instance.setSetting(GlobalDIDSessionsService.signedInDIDString, "wallet", tokenCacheKey, this.tokenDecimals);

                Logger.log('wallet', "Got ERC20 token decimals", this.id, "Decimals: ", this.tokenDecimals, ". Saving to disk");
            } catch (error) {
                Logger.log('wallet', 'ERC20 Token (', this.id, ') fetchTokenDecimals error:', error);
            }
        }
        else {
            //Logger.log('wallet', "Got ERC20 token decimals from cache", this.id, "Decimals: ", this.tokenDecimals);
        }

        this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals)
    }

    public getDisplayBalance(): BigNumber {
        return this.getDisplayAmount(this.balance);
    }

    public getDisplayAmount(amount: BigNumber): BigNumber {
        return amount; // Raw value and display value are the same: the number of tokens.
    }

    // The resurn value is devided by the number of decimals used by the token.
    public getDisplayValue(amount: string): BigNumber {
      return new BigNumber(amount).dividedBy(this.tokenAmountMulipleTimes);
    }

    public getAmountInExternalCurrency(value: BigNumber): BigNumber {
        // No way to compute the actual value in currency for this token - would require to be bound to an exchange
        // to get its valuation, which we have not for now.
        return null;
    }

    /**
     * Check whether the balance is enough.
     * @param amount unit is ETHER
     */
    public isBalanceEnough(amount: BigNumber) {
        // The fee is ELA/ETHSC, not ERC20 TOKEN. So can send all the balance.
        return this.balance.gte(amount);
    }

    private async getERC20TransactionDirection(targetAddress: string): Promise<TransactionDirection> {
        const address = await this.getTokenAccountAddress();
        if (address === targetAddress.toLowerCase()) {
            return TransactionDirection.RECEIVED;
        } else {
            return TransactionDirection.SENT;
        }
    }

    public async update() {
      await this.updateBalance();
      await this.getTransactionByRPC();
    }

    public async updateBalance() {
        Logger.log('wallet', "Updating ERC20 token balance for token: ", this.id);
        if (!this.tokenDecimals) {
            await this.fetchTokenDecimals();
        }

        try {
            const tokenAccountAddress = await this.getTokenAccountAddress();
            const contractAddress = this.coin.getContractAddress();
            const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });

            // TODO: what's the integer type returned by web3? Are we sure we can directly convert it to BigNumber like this? To be tested
            const balanceEla = await erc20Contract.methods.balanceOf(tokenAccountAddress).call();
            // The returned balance is an int. Need to devide by the number of decimals used by the token.
            this.balance = new BigNumber(balanceEla).dividedBy(this.tokenAmountMulipleTimes);
            this.saveBalanceToCache();
            Logger.log('wallet', this.id+": raw balance:", balanceEla, " Converted balance: ", this.balance);
        } catch (error) {
            Logger.log('wallet', 'ERC20 Token (', this.id, ') updateBalance error:', error);
        }
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
        if (this.transactions == null) {
          await this.getTransactionByRPC();
          this.loadTxDataFromCache = false;
        } else {
          this.loadTxDataFromCache = true;
        }

        if (this.transactions) {
          // For performance, only return 20 transactions.
          let newTxList:AllTransactionsHistory = {
            totalcount: this.transactions.totalcount,
            txhistory :this.transactions.txhistory.slice(startIndex, startIndex + 20),
          }
          return newTxList;
        } else {
          return null;
        }
    }

    public getTransactionByHash(hash: string) : EthTransaction {
      if (this.transactions && this.transactions.txhistory) {
        let existingIndex = (this.transactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
        if (existingIndex >= 0) {
          return this.transactions.txhistory[existingIndex] as EthTransaction;
        }
      }
      return null;
    }

    async getTransactionByRPC() {
        Logger.log('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id)
        const contractAddress = this.coin.getContractAddress().toLowerCase();
        const tokenAccountAddress = await this.getTokenAccountAddress();
        let result = await this.jsonRPCService.getERC20TokenTransactions(StandardCoinName.ETHSC, tokenAccountAddress);
        // Logger.test('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id, ' result:', result)
        if (result) {
          let allTx = result.filter((tx)=> {
            return tx.contractAddress === contractAddress
          })
          this.transactions = {totalcount:allTx.length, txhistory:allTx};
          await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
        }
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let result = await this.jsonRPCService.eth_getTransactionByHash(StandardCoinName.ETHSC, txid);
      if (!result) {
        // Remove error transaction.
        await this.removeInvalidTransaction(txid);
      }
      return result;
    }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        const timestamp = parseInt(transaction.timeStamp) * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const direction = await this.getERC20TransactionDirection(transaction.to);
        transaction.Direction = direction;

        const transactionInfo: TransactionInfo = {
            amount: this.getDisplayValue(transaction.value),
            confirmStatus: parseInt(transaction.confirmations),
            datetime,
            direction: direction,
            fee: transaction.gas,
            height: parseInt(transaction.blockNumber),
            memo: '',
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '',
            from: transaction.from,
            to: transaction.to,
            timestamp,
            txid: transaction.hash,
            type: null,
            isCrossChain: false,
        };

        // Use Config.WEI: because the gas is ETHSC.
        // transactionInfo.fee = (this.tokenDecimals > 0 ? new BigNumber(transaction.gas).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(Config.WEI) : transaction.gas).toString();
        transactionInfo.fee = (new BigNumber(transaction.gas).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(Config.WEI)).toString();

        if (transactionInfo.confirmStatus !== 0) {
            transactionInfo.status = TransactionStatus.CONFIRMED;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = TransactionStatus.PENDING;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-pending");
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

    // TODO: Refine / translate with more detailed info: smart contract run, cross chain transfer or ERC payment, etc
    protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getERC20TransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return "wallet.coin-action-receive";
            case TransactionDirection.SENT:
                return "wallet.coin-action-send";
            default:
                return "Invalid";
        }
    }


    // TODO: Refine with more detailed info: smart contract run, cross chain transfer or ERC payment, etc
    protected async getTransactionIconPath(transaction: EthTransaction): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getERC20TransactionDirection(transaction.to);
        if (direction === TransactionDirection.RECEIVED) {
            return './assets/wallet/buttons/receive.png';
        } else if (direction === TransactionDirection.SENT) {
            return './assets/wallet/buttons/send.png';
        } else if (direction === TransactionDirection.MOVED) {
            return './assets/wallet/buttons/transfer.png';
        }

        return null;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gssLimit: string): Promise<any> {
        return Promise.resolve([]);
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string, gasPriceArg: string = null, gasLimitArg:string = null): Promise<any> {
        const tokenAccountAddress = await this.getTokenAccountAddress();
        const contractAddress = this.coin.getContractAddress();
        const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });
        let gasPrice = gasPriceArg;
        if (gasPrice == null) {
          gasPrice = await this.web3.eth.getGasPrice();
        }

        Logger.log('wallet', 'createPaymentTransaction toAddress:', toAddress, ' amount:', amount, 'gasPrice:', gasPrice);
        // Convert the Token amount (ex: 20 TTECH) to contract amount (=token amount (20) * 10^decimals)
        const amountWithDecimals = new BigNumber(amount).multipliedBy(this.tokenAmountMulipleTimes);

        // Incompatibility between our bignumber lib and web3's BN lib. So we must convert by using intermediate strings
        const web3BigNumber = this.web3.utils.toBN(amountWithDecimals.toString(10));
        const method = erc20Contract.methods.transfer(toAddress, web3BigNumber);

        let gasLimit = gasLimitArg;
        if (gasLimit == null) {
          gasLimit = '100000';
          try {
              // Estimate gas cost
              gasLimit = await method.estimateGas();
          } catch (error) {
              Logger.log('wallet', 'estimateGas error:', error);
          }
        }

        let nonce = await this.getNonce();
        const rawTx =
        await this.masterWallet.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            StandardCoinName.ETHSC,
            contractAddress,
            '0',
            0, // WEI
            gasPrice,
            0, // WEI
            gasLimit.toString(),
            method.encodeABI(),
            nonce
        );
        return rawTx;
    }

    public async publishTransaction(transaction: string): Promise<string> {
      let obj = JSON.parse(transaction) as SignedETHSCTransaction;
      let txid = await this.jsonRPCService.eth_sendRawTransaction(StandardCoinName.ETHSC, obj.TxSigned);
      return txid;
    }

    public signAndSendRawTransaction(transaction: string, transfer: Transfer): Promise<RawTransactionPublishResult> {
        Logger.log('wallet', "ERC20 signAndSendRawTransaction transaction:", transaction, transfer);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve)=>{
            try {
              const password = await this.masterWallet.walletManager.openPayModal(transfer);
              if (!password) {
                  Logger.log('wallet', "No password received. Cancelling");
                  resolve({
                      published: false,
                      txid: null,
                      status: 'cancelled'
                  });
                  return;
              }

              Logger.log('wallet', "Password retrieved. Now signing the transaction.");

              const signedTx = await this.masterWallet.walletManager.spvBridge.signTransaction(
                  this.masterWallet.id,
                  StandardCoinName.ETHSC,
                  transaction,
                  password
              );

              Logger.log('wallet', "Transaction signed. Now publishing.", this);

              const txid = await this.publishTransaction(signedTx);
              Logger.log('wallet', "Published transaction id:", txid);

              let published = true;
              let status = 'published';
              if (!txid || txid.length == 0) {
                published = false;
                status = 'error';
              }
              resolve({
                  published,
                  status,
                  txid
              });
            }
            catch (err) {
              await this.masterWallet.walletManager.native.hideLoading();
              Logger.error("wallet", "Publish error:", err);
              resolve({
                published: false,
                txid: null,
                status: 'error',
                code: err.code,
                message: err.message,
              });
            }
        });
    }

    /**
     * Returns the current gas price on chain.
     */
     public async getGasPrice(): Promise<string> {
      const gasPrice = await this.web3.eth.getGasPrice();
      Logger.log('wallet', "GAS PRICE: ", gasPrice)
      return gasPrice;
    }

    private async getNonce() {
      const address = await this.getTokenAccountAddress();
      try {
        return this.jsonRPCService.getETHSCNonce(StandardCoinName.ETHSC, address);
      }
      catch (err) {
        Logger.error('wallet', 'getNonce failed, ', this.id, ' error:', err);
      }
      return -1;
    }

    public async saveTransactions(transactionsList: EthTransaction[]): Promise<void> {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].hash, transactionsList[i], parseInt(transactionsList[i].timeStamp));
      }
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      await this.transactionsCache.save();
    }

    private async removeInvalidTransaction(hash: string): Promise<void> {
      let existingIndex = (this.transactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Find invalid transaction, remove it ', hash);
        this.transactions.txhistory.splice(existingIndex, 1);
        this.transactions.totalcount--;

        this.transactionsCache.remove(hash);
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        await this.transactionsCache.save();
      }
    }
}
