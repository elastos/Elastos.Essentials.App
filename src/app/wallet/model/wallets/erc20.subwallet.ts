import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { Subject } from 'rxjs';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { EssentialsWeb3Provider } from 'src/app/model/essentialsweb3provider';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import Web3 from 'web3';
import { Config } from '../../config/Config';
import { Transfer } from '../../services/cointransfer.service';
import { CurrencyService } from '../../services/currency.service';
import { Coin, CoinID, CoinType, ERC20Coin } from '../coin';
import { EthTransaction, SignedETHSCTransaction } from '../evm.types';
import { RawTransactionPublishResult, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../providers/transaction.types';
import { NetworkWallet } from './networkwallet';
import { SerializedSubWallet, SubWallet } from './subwallet';


export class ERC20SubWallet extends SubWallet<EthTransaction> {
    /** Coin related to this wallet */
    public coin: ERC20Coin;
    /** Web3 variables to call smart contracts */
    protected web3: Web3;
    private erc20ABI: any;

    private tokenAddress = '';

    protected spvConfigEVMCode: string = null; // Ex: ETHHECO, ETHSC

    public static newFromCoin(networkWallet: NetworkWallet, coin: Coin): Promise<ERC20SubWallet> {
        const subWallet = networkWallet.network.createERC20SubWallet(networkWallet, coin.getID());
        return Promise.resolve(subWallet);
    }

    public static newFromSerializedSubWallet(networkWallet: NetworkWallet, serializedSubWallet: SerializedSubWallet): ERC20SubWallet {
        Logger.log('wallet', "Initializing ERC20 subwallet from serialized sub wallet", serializedSubWallet);
        if (!serializedSubWallet.id) {
            Logger.error('wallet', 'newFromSerializedSubWallet id is null');
            return null;
        }
        const coin = networkWallet.network.getCoinByID(serializedSubWallet.id) as ERC20Coin;
        if (coin) {
            const subWallet = networkWallet.network.createERC20SubWallet(networkWallet, serializedSubWallet.id, false);
            // subWallet.initFromSerializedSubWallet(serializedSubWallet);
            return subWallet;
        } else {
            Logger.error('wallet', 'newFromSerializedSubWallet error, this coin is not a known coin for this network.');
            return null;
        }
    }

    constructor(
        public networkWallet: NetworkWallet,
        id: CoinID,
        private rpcApiUrl: string,
        protected displayableERC20TokenInfo: string // Ex: "HRC20 Token"
    ) {
        super(networkWallet, id, CoinType.ERC20);

        this.spvConfigEVMCode = this.networkWallet.network.getEVMSPVConfigName();
        void this.initialize();
    }

    private async initialize() {
        this.coin = this.networkWallet.network.getCoinByID(this.id) as ERC20Coin;
        // Get Web3 and the ERC20 contract ready
        const trinityWeb3Provider = new EssentialsWeb3Provider(this.rpcApiUrl);
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc20ABI = require("../../../../assets/wallet/ethereum/StandardErc20ABI.json");

        // First retrieve the number of decimals used by this token. this is needed for a good display,
        // as we need to convert the balance integer using the number of decimals.
        await this.fetchTokenDecimals();

        runDelayed(() => this.updateBalance(), 5000);
    }

    public getUniqueIdentifierOnNetwork(): string {
        return this.coin.getContractAddress().toLowerCase();
    }

    public async createAddress(): Promise<string> {
        // Create on ETH always returns the same unique address.
        return await this.masterWallet.walletManager.spvBridge.createAddress(this.masterWallet.id, this.spvConfigEVMCode);
    }

    public async getTokenAccountAddress(): Promise<string> {
        if (!this.tokenAddress) {
            this.tokenAddress = (await this.createAddress()).toLowerCase();
        }
        return this.tokenAddress;
    }

    public getFriendlyName(): string {
        const coin = this.networkWallet.network.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getDescription();
    }

    public getDisplayTokenName(): string {
        const coin = this.networkWallet.network.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getName();
    }

    public transactionsListChanged(): Subject<void> {
        return this.networkWallet.getTransactionDiscoveryProvider().transactionsListChanged(this.coin.getContractAddress().toLowerCase());
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
        return this.getDisplayAmount(this.getRawBalance());
    }

    public getDisplayAmount(amount: BigNumber): BigNumber {
        return amount.dividedBy(this.tokenAmountMulipleTimes);
    }

    // The resurn value is devided by the number of decimals used by the token.
    public getDisplayValue(amount: string): BigNumber {
        return new BigNumber(amount).dividedBy(this.tokenAmountMulipleTimes);
    }

    public getAmountInExternalCurrency(value: BigNumber): BigNumber {
        return CurrencyService.instance.getERC20TokenValue(value, this.coin);
    }

    public getUSDBalance(): BigNumber {
        return CurrencyService.instance.getERC20TokenValue(this.getBalance(), this.coin, this.networkWallet.network, 'USD');
    }

    public getMainIcon(): string {
        return this.networkWallet.network.logo;
    }

    public getSecondaryIcon(): string {
        return null;
        // TODO: show real token icon for famous tokens, or placeholder image for unknown tokens.
        //return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAQAAAAm93DmAAAAJklEQVR42u3MMQEAAAgDINc/9AyhJwQg7byKUCgUCoVCoVAoFN4sl/dP2UHkSR8AAAAASUVORK5CYII=";
    }

    /**
     * Returns the info string to show to describe the type of ERC20 tokens held by this subwallet.
     * i.e.: "Elastos ERC20 token"
     */
    public getDisplayableERC20TokenInfo(): string {
        return this.displayableERC20TokenInfo;
    }

    /**
     * Check whether the balance is enough.
     * @param amount unit is WEI
     */
    public isBalanceEnough(amount: BigNumber) {
        // The fee is ELA/ETHSC, not ERC20 TOKEN. So can send all the balance.
        return this.getRawBalance().gte(amount.multipliedBy(this.tokenAmountMulipleTimes));
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
    }

    public async updateBalance() {
        Logger.log('wallet', "Updating ERC20 token balance for token: ", this.coin.getName());
        if (!this.tokenDecimals) {
            await this.fetchTokenDecimals();
        }

        try {
            const tokenAccountAddress = await this.getTokenAccountAddress();
            const contractAddress = this.coin.getContractAddress();
            const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });

            // TODO: what's the integer type returned by web3? Are we sure we can directly convert it to BigNumber like this? To be tested
            const rawBalance = await erc20Contract.methods.balanceOf(tokenAccountAddress).call();
            if (rawBalance) {
                this.balance = new BigNumber(rawBalance);
                await this.saveBalanceToCache();
                Logger.log('wallet', this.coin.getName(), this.id + ": balance:", this.getRawBalance().toString());
            }
        } catch (error) {
            Logger.log('wallet', 'ERC20 Token (', this.coin.getName(), this.id, ') updateBalance error:', error);
        }
    }

    public getTransactionsCacheKey(): string {
        return this.masterWallet.id + "-" + this.networkWallet.network.key + "-" + this.coin.getContractAddress().toLowerCase() + "-transactions";
    }

    /* public async getTransactions(startIndex: number): Promise<ElastosPaginatedTransactions> {
        if (this.paginatedTransactions == null) {
          await this.getTransactionsByRpc();
          this.loadTxDataFromCache = false;
        } else {
          this.loadTxDataFromCache = true;
        }

        if (this.paginatedTransactions) {
          // For performance, only return 20 transactions.
          let newTxList:ElastosPaginatedTransactions = {
            totalcount: this.paginatedTransactions.totalcount,
            txhistory :this.paginatedTransactions.txhistory.slice(startIndex, startIndex + 20),
          }
          return newTxList;
        } else {
          return null;
        }
    } */

    public async getTransactionByHash(hash: string): Promise<EthTransaction> {
        let transactions = await this.getTransactions();
        if (transactions) {
            let existingIndex = (transactions as EthTransaction[]).findIndex(i => i.hash == hash);
            if (existingIndex >= 0) {
                return transactions[existingIndex] as EthTransaction;
            }
        }
        return null;
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
        let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(this.rpcApiUrl, txid);
        if (!result) {
            // Remove error transaction.
            // TODO await this.removeInvalidTransaction(txid);
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
            status: TransactionStatus.UNCONFIRMED, // TODO @zhiming: was: transaction.Status,
            statusName: "TODO", // TODO @zhiming: was: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '',
            from: transaction.from,
            to: transaction.to,
            timestamp,
            txid: transaction.hash,
            type: null,
            isCrossChain: false,
        };

        // Use Config.WEI: because the gas is ETHSC.
        transactionInfo.fee = (new BigNumber(transaction.gasUsed).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(Config.WEI)).toString();

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
                return "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return "wallet.coin-op-sent-token";
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

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string, gasPriceArg: string = null, gasLimitArg: string = null): Promise<any> {
        const tokenAccountAddress = await this.getTokenAccountAddress();
        const contractAddress = this.coin.getContractAddress();
        const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });
        let gasPrice = gasPriceArg;
        if (gasPrice == null) {
            gasPrice = await this.web3.eth.getGasPrice();
        }

        Logger.log('wallet', 'createPaymentTransaction toAddress:', toAddress, ' amount:', amount, 'gasPrice:', gasPrice);
        // Convert the Token amount (ex: 20 TTECH) to contract amount (=token amount (20) * 10^decimals)
        let amountWithDecimals: BigNumber;
        if (amount === -1) {//-1: send all.
            amountWithDecimals = this.balance;
        } else {
            amountWithDecimals = new BigNumber(amount).multipliedBy(this.tokenAmountMulipleTimes);
        }

        // Incompatibility between our bignumber lib and web3's BN lib. So we must convert by using intermediate strings
        const web3BigNumber = this.web3.utils.toBN(amountWithDecimals.toString(10));
        const method = erc20Contract.methods.transfer(toAddress, web3BigNumber);

        let gasLimit = gasLimitArg;
        if (gasLimit == null) {
            gasLimit = '100000';
            try {
                // Estimate gas cost
                let gasTemp = await method.estimateGas();
                // '* 1.5': Make sure the gaslimit is big enough.
                gasLimit = Util.ceil(gasTemp * 1.5).toString();
            } catch (error) {
                Logger.log('wallet', 'estimateGas error:', error);
            }
        }

        let nonce = await this.getNonce();
        const rawTx =
            await this.masterWallet.walletManager.spvBridge.createTransferGeneric(
                this.masterWallet.id,
                this.spvConfigEVMCode,
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
        let txid = await GlobalEthereumRPCService.instance.eth_sendRawTransaction(this.rpcApiUrl, obj.TxSigned);
        return txid;
    }

    public signAndSendRawTransaction(transaction: string, transfer: Transfer): Promise<RawTransactionPublishResult> {
        Logger.log('wallet', "ERC20 signAndSendRawTransaction transaction:", transaction, transfer);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve) => {
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
                    this.spvConfigEVMCode,
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
            return GlobalEthereumRPCService.instance.getETHSCNonce(this.rpcApiUrl, address);
        }
        catch (err) {
            Logger.error('wallet', 'getNonce failed, ', this.id, ' error:', err);
        }
        return -1;
    }

    /* public async saveTransactions(transactionsList: EthTransaction[]): Promise<void> {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].hash, transactionsList[i], parseInt(transactionsList[i].timeStamp));
      }
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
      await this.transactionsCache.save();
    } */

    /* TODO private async removeInvalidTransaction(hash: string): Promise<void> {
      let existingIndex = (this.paginatedTransactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Found invalid transaction, remove it ', hash);
        this.paginatedTransactions.txhistory.splice(existingIndex, 1);
        this.paginatedTransactions.totalcount--;

        this.transactionsCache.remove(hash);
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
        await this.transactionsCache.save();
      }
    } */
}
