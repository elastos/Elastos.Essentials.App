import { StandardSubWallet } from './StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, EthTransaction, TransactionDetail, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../Transaction';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';

declare let walletManager: WalletPlugin.WalletManager;

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ETHChainSubWallet extends StandardSubWallet {
    private ethscAddress: string = null;
    private web3 = null;
    private timestampGetBalance = 0;

    constructor(masterWallet: MasterWallet) {
        super(masterWallet, StandardCoinName.ETHSC);

        this.initWeb3();
    }

    public async getTokenAddress(): Promise<string> {
        if (!this.ethscAddress) {
            this.ethscAddress = await this.createAddress();
        }
        return this.ethscAddress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
      let allTransactions = await this.masterWallet.walletManager.spvBridge.getAllTransactions(this.masterWallet.id, startIndex, '');
      return {totalcount: allTransactions.MaxCount, txhistory:allTransactions.Transactions};
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let transactions = await this.masterWallet.walletManager.spvBridge.getAllTransactions(this.masterWallet.id, 0, txid);
      Logger.warn('wallet', 'ETHSC getTransactionDetails:',transactions)
      if (transactions.Transactions) {
        return transactions.Transactions[0];
      }
      return null;
    }

    /**
     * Use smartcontract to Send ELA from ETHSC to mainchain.
     */
    public getWithdrawContractAddress() {
        return Config.ETHSC_CONTRACT_ADDRESS;
    }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        const timestamp = transaction.Timestamp * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const direction = await this.getETHSCTransactionDirection(transaction.TargetAddress);
        transaction.Direction = direction;

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(-1), // Defined by inherited classes
            confirmStatus: transaction.Confirmations, // Defined by inherited classes
            datetime,
            direction: direction,
            fee: transaction.Fee.toString(),
            height: transaction.BlockNumber,
            memo: '',
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '', // Defined by inherited classes
            timestamp,
            txid: transaction.Hash, // Defined by inherited classes
            type: null, // Defined by inherited classes
        };


        // TODO: Why BlockNumber is 0 sometimes? Need to check.
        // if (transaction.IsErrored || (transaction.BlockNumber === 0)) {
        if (transaction.IsErrored) {
            return null;
        }

        transactionInfo.amount = new BigNumber(transaction.Amount).dividedBy(Config.WEI);
        transactionInfo.fee = (transaction.Fee / Config.WEI).toString();

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

    protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.TargetAddress);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return this.getETHSCTransactionContractType(transaction, translate);
        }
        return null;
    }

    protected async getTransactionIconPath(transaction: EthTransaction): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.TargetAddress);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return './assets/wallet/buttons/receive.png';
            case TransactionDirection.SENT:
                return './assets/wallet/buttons/send.png';
        }
    }

    private async getETHSCTransactionDirection(targetAddress: string): Promise<TransactionDirection> {
        const address = await this.getTokenAddress();
        if (address === targetAddress) {
            return TransactionDirection.RECEIVED;
        } else {
            return TransactionDirection.SENT;
        }
    }

    private getETHSCTransactionContractType(transaction: EthTransaction, translate: TranslateService): string {
        if ('ERC20Transfer' === transaction.TokenFunction) {
            return "wallet.coin-op-contract-token-transfer";
        } else if (transaction.TargetAddress === '') {
            return "wallet.coin-op-contract-create";
        } else if (transaction.TargetAddress === '0x0000000000000000000000000000000000000000') {
            return "coin-op-contract-destroy";
        } else if (transaction.TargetAddress === Config.ETHSC_CONTRACT_ADDRESS) {
            // withdraw to MainChain
            // no TokenFunction
            return "wallet.coin-dir-to-mainchain";
        } else if (transaction.Amount !== '0') {
            return "wallet.coin-op-sent-token";
        } else {
            return "wallet.coin-op-contract-call";
        }
    }

    private async initWeb3() {
        const trinityWeb3Provider = new EssentialsWeb3Provider();
        this.web3 = new Web3(trinityWeb3Provider);
    }

    private async getBalanceByWeb3(): Promise<BigNumber> {
        const address = await this.getTokenAddress();
        try {
          const balanceString = await this.web3.eth.getBalance(address);
          return new BigNumber(balanceString).dividedBy(10000000000); // WEI to SELA;
        }
        catch (e) {
          Logger.error('wallet', 'getBalanceByWeb3 exception:', e);
          return new BigNumber(NaN);
        }
    }

    public async updateBalance(): Promise<void> {
        this.balance = await this.getBalanceByWeb3();
    }

    public async getERC20TokenList(): Promise<WalletPlugin.ERC20TokenInfo[]> {
        const address = await this.getTokenAddress();
        const tokenlist = await walletManager.getERC20TokenList(address);
        Logger.log('wallet', 'getERC20TokenList:', tokenlist);
        return tokenlist;
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<string> {
        return this.masterWallet.walletManager.spvBridge.createTransfer(
            this.masterWallet.id,
            toAddress,
            amount.toString(),
            6 // ETHER_ETHER
        );
    }

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
        const provider = new EssentialsWeb3Provider();
        const web3 = new Web3(provider);

        const contractAbi = require("../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
        const contractAddress = Config.ETHSC_CONTRACT_ADDRESS;
        const ethscWithdrawContract = new web3.eth.Contract(contractAbi, contractAddress);
        const gasPrice = await web3.eth.getGasPrice();
        const toAmountSend = web3.utils.toWei(toAmount.toString());

        const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);

        const gasLimit = 100000;
        // TODO: The value from estimateGas is too small sometimes (eg 22384) for withdraw transaction.
        // Maybe it is the bug of node?
        // try {
        //     // Estimate gas cost
        //     gasLimit = await method.estimateGas();
        // } catch (error) {
        //     Logger.log('wallet', 'estimateGas error:', error);
        // }

        const data = method.encodeABI();
        return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            contractAddress,
            toAmountSend,
            0, // WEI
            gasPrice,
            0, // WEI
            gasLimit.toString(),
            data,
        );
    }

    public async publishTransaction(transaction: string): Promise<string> {
      const publishedTransaction =
            await this.masterWallet.walletManager.spvBridge.publishTransaction(
                this.masterWallet.id,
                transaction
            );
      return publishedTransaction.TxHash;
    }

    /**
     * Returns the current gas price on chain.
     */
    public getGasPrice(): Promise<BigNumber> {
        return this.web3.eth.getGasPrice();
    }
}
