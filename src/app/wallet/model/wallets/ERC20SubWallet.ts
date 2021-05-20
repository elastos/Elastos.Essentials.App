import Web3 from 'web3';

import { MasterWallet } from './MasterWallet';
import { SubWallet, SerializedSubWallet, RawTransactionPublishResult } from './SubWallet';
import { CoinType, CoinID, Coin, ERC20Coin, StandardCoinName } from '../Coin';
import { Util } from '../Util';
import { Transfer } from '../../services/cointransfer.service';
import BigNumber from 'bignumber.js';
import { TranslateService } from '@ngx-translate/core';
import { AllTransactions, AllTransactionsHistory, EthTransaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../Transaction';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';

export class ERC20SubWallet extends SubWallet {
    /** Coin related to this wallet */
    private coin: ERC20Coin;
    /** Web3 variables to call smart contracts */
    private web3: Web3;
    private erc20ABI: any;
    private tokenDecimals: number;

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
            // Get info by web3, don't use the data in local storage.
            // subWallet.initFromSerializedSubWallet(serializedSubWallet);
            return subWallet;
        } else {
            Logger.error('wallet', 'newFromSerializedSubWallet error, this coin is not in coinService');
            return null;
        }
    }

    constructor(masterWallet: MasterWallet, id: CoinID) {
        super(masterWallet, id, CoinType.ERC20);

        this.initialize();
    }

    private async initialize() {
        this.coin = this.masterWallet.coinService.getCoinByID(this.id) as ERC20Coin;
        // Get Web3 and the ERC20 contract ready
        const trinityWeb3Provider = new EssentialsWeb3Provider();
        this.web3 = new Web3(trinityWeb3Provider);

        // Standard ERC20 contract ABI
        this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");

        // Use NaN if can't get balance from web3
        this.balance = new BigNumber(NaN);

        // First retrieve the number of decimals used by this token. this is needed for a good display,
        // as we need to convert the balance integer using the number of decimals.
        await this.fetchTokenDecimals();
        await this.updateBalance();
    }

    public async createAddress(): Promise<string> {
        // Create on ETH always returns the same unique address.
        return await this.masterWallet.walletManager.spvBridge.createAddress(this.masterWallet.id, StandardCoinName.ETHSC);
    }

    private async getTokenAccountAddress(): Promise<string> {
        if (!this.tokenAddress) {
            this.tokenAddress = await this.createAddress();
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

    private async fetchTokenDecimals(): Promise<void> {
        try {
            const tokenAccountAddress = await this.getTokenAccountAddress();
            const contractAddress = this.coin.getContractAddress();
            const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });
            this.tokenDecimals = await erc20Contract.methods.decimals().call();

            Logger.log('wallet', this.id+" decimals: ", this.tokenDecimals);
        } catch (error) {
            Logger.log('wallet', 'ERC20 Token (', this.id, ') fetchTokenDecimals error:', error);
        }
    }

    public getDisplayBalance(): BigNumber {
        return this.getDisplayAmount(this.balance);
    }

    public getDisplayAmount(amount: BigNumber): BigNumber {
        return amount; // Raw value and display value are the same: the number of tokens.
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
        if (address === targetAddress) {
            return TransactionDirection.RECEIVED;
        } else {
            return TransactionDirection.SENT;
        }
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
            this.balance = new BigNumber(balanceEla).dividedBy(new BigNumber(10).pow(this.tokenDecimals));
            Logger.log('wallet', this.id+": raw balance:", balanceEla, " Converted balance: ", this.balance);

            const eventId = this.masterWallet.id + ':' + this.id + ':synccompleted';
            this.masterWallet.walletManager.events.publish(eventId, this.id);
        } catch (error) {
            Logger.log('wallet', 'ERC20 Token (', this.id, ') updateBalance error:', error);
        }
    }

    // It will be called When the ETHSC update the sync progress.
    public updateSyncProgress(progress: number, lastBlockTime: number) {
        this.timestamp = lastBlockTime*1000;
        this.syncTimestamp = this.timestamp;
        this.lastBlockTime = Util.dateFormat(new Date(this.timestamp), 'YYYY-MM-DD HH:mm:ss');
        this.progress = progress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
        // TODO
        let allTransactions;// = await this.masterWallet.walletManager.spvBridge.getTokenTransactions(this.masterWallet.id, startIndex, '', this.id);
        // Logger.log('wallet', "Get all transaction count for coin "+this.id+": ", allTransactions && allTransactions.Transactions ? allTransactions.Transactions.length : -1, "startIndex: ", startIndex);
        return allTransactions;
    }

    public async getTransactionDetails(txid: string): Promise<AllTransactions> {
        const transactionDetails = await this.masterWallet.walletManager.spvBridge.getTokenTransactions(this.masterWallet.id, 0, txid, this.id);
        return transactionDetails;
    }

    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        const transactionInfo = await super.getTransactionInfo(transaction, translate);
        const direction = await this.getERC20TransactionDirection(transaction.address);

        // TODO: Why BlockNumber is 0 sometimes? Need to check.
        // if (transaction.IsErrored || (transaction.BlockNumber === 0)) {
        // if (transaction.IsErrored) {
        //     return null;
        // }
        // TODO
        // transactionInfo.amount = this.tokenDecimals > 0 ? new BigNumber(transaction.Amount).dividedBy(this.tokenDecimals) : new BigNumber(transaction.Amount);
        // transactionInfo.fee = this.tokenDecimals > 0 ? transaction.Fee / this.tokenDecimals : transaction.Fee;
        // transactionInfo.txid = transaction.TxHash || transaction.Hash; // ETHSC use TD or Hash
        // // ETHSC use Confirmations - TODO: FIX THIS - SHOULD BE EITHER CONFIRMSTATUS (mainchain) or CONFIRMATIONS BUT NOT BOTH
        // transactionInfo.confirmStatus = transaction.Confirmations;

        if (transactionInfo.confirmStatus !== 0) {
            transactionInfo.status = 'Confirmed';
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = 'Pending';
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
    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        const direction = await this.getERC20TransactionDirection(transaction.address);
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
    protected async getTransactionIconPath(transaction: TransactionHistory): Promise<string> {
        const direction = await this.getERC20TransactionDirection(transaction.address);
        if (direction === TransactionDirection.RECEIVED) {
            return './assets/wallet/buttons/receive.png';
        } else if (direction === TransactionDirection.SENT) {
            return './assets/wallet/buttons/send.png';
        } else if (direction === TransactionDirection.MOVED) {
            return './assets/wallet/buttons/transfer.png';
        }

        return null;
    }

    public async createWithdrawTransaction(toAddress: string, amount: number, memo: string): Promise<any> {
        return Promise.resolve([]);
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<any> {
        const tokenAccountAddress = await this.getTokenAccountAddress();
        const contractAddress = this.coin.getContractAddress();
        const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, contractAddress, { from: tokenAccountAddress });
        const gasPrice = await this.web3.eth.getGasPrice();

        Logger.log('wallet', 'createPaymentTransaction toAddress:', toAddress, ' amount:', amount, 'gasPrice:', gasPrice);

        // Convert the Token amount (ex: 20 TTECH) to contract amount (=token amount (20) * 10^decimals)
        const amountWithDecimals = new BigNumber(amount).multipliedBy(new BigNumber(10).pow(this.tokenDecimals));

        // Incompatibility between our bignumber lib and web3's BN lib. So we must convert by using intermediate strings
        const web3BigNumber = this.web3.utils.toBN(amountWithDecimals.toString(10));
        const method = erc20Contract.methods.transfer(toAddress, web3BigNumber);

        let gasLimit = 100000;
        try {
            // Estimate gas cost
            gasLimit = await method.estimateGas();
        } catch (error) {
            Logger.log('wallet', 'estimateGas error:', error);
        }

        const rawTx =
        await this.masterWallet.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            contractAddress,
            '0',
            0, // WEI
            gasPrice,
            0, // WEI
            gasLimit.toString(),
            method.encodeABI(),
        );

        Logger.log('wallet', 'Created raw ESC transaction:', rawTx);

        return rawTx;
    }

    public async signAndSendRawTransaction(transaction: string, transfer: Transfer): Promise<RawTransactionPublishResult> {
        Logger.log('wallet', "ERC20 signAndSendRawTransaction transaction:", transaction, transfer);

        return new Promise(async (resolve)=>{
            Logger.log('wallet', 'Received raw transaction', transaction);
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

            await this.masterWallet.walletManager.native.showLoading();

            const signedTx = await this.masterWallet.walletManager.spvBridge.signTransaction(
                this.masterWallet.id,
                StandardCoinName.ETHSC,
                transaction,
                password
            );

            Logger.log('wallet', "Transaction signed. Now publishing.");

            // TODO
            // const publishedTransaction =
            // await this.masterWallet.walletManager.spvBridge.publishTransaction(
            //     this.masterWallet.id,
            //     StandardCoinName.ETHSC,
            //     signedTx
            // );

            // this.masterWallet.walletManager.setRecentWalletId(this.masterWallet.id);

            // if (!Util.isEmptyObject(transfer.action)) {
            //     Logger.log('wallet', "Mode: transfer with intent action");
            //     this.masterWallet.walletManager.lockTx(publishedTransaction.TxHash);

            //     setTimeout(async () => {
            //         let status = 'published';
            //         let txid = publishedTransaction.TxHash;
            //         const code = this.masterWallet.walletManager.getTxCode(txid);
            //         if (code !== 0) {
            //             txid = null;
            //             status = 'error';
            //         }
            //         this.masterWallet.walletManager.native.hideLoading();
            //         resolve({
            //             published: true,
            //             txid: txid,
            //             status
            //         });
            //     }, 5000); // wait for 5s for txPublished
            // } else {
            //     Logger.log('wallet', "Published transaction id:", publishedTransaction.TxHash);

            //     await this.masterWallet.walletManager.native.hideLoading();
            //     await this.masterWallet.walletManager.native.setRootRouter('/wallet/wallet-home');

            //     resolve({
            //         published: true,
            //         status: 'published',
            //         txid: publishedTransaction.TxHash
            //     });
            // }
        });
    }
}
