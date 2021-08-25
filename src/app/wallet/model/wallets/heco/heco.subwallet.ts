import { StandardSubWallet } from '../standard.subwallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType } from '../../transaction.types';
import { StandardCoinName } from '../../coin';
import { MasterWallet } from '../masterwallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';
import { ERC20SubWallet } from '../erc20.subwallet';
import { NetworkWallet } from '../NetworkWallet';
import { ERC20TokenInfo, EthTransaction, ERC20TokenTransactionInfo, ETHSCTransferType, EthTokenTransaction, SignedETHSCTransaction } from '../../evm.types';
import { StandardEVMSubWallet } from '../evm.subwallet';

/**
 * Specialized standard sub wallet for the HECO sidechain.
 */
export class HECOChainSubWallet extends StandardEVMSubWallet {
    constructor(networkWallet: NetworkWallet) {
        super(networkWallet, StandardCoinName.ETHHECO);

        void this.initialize();
    }

    protected async initialize() {
        await super.initialize();
    }

    public getFriendlyName(): string {
      return "Huobi Token";
    }

    public getDisplayTokenName(): string {
      return "HT";
    }

    public async getTransactionsByRpc() {
      Logger.log('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id)
      const address = await this.getTokenAddress();
      let result = await this.jsonRPCService.getHECOTransactions(this.id as StandardCoinName, address);
      if (result) {
        if (this.transactions == null) {
          // init
          this.transactions = {totalcount:0, txhistory:[]};
        }
        if ((result.length > 0) && (this.transactions.totalcount !== result.length)) {
            // Has new transactions.
            this.transactions.totalcount = result.length;
            this.transactions.txhistory = result.reverse();
            await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
        } else {
          // Notify the page to show the right time of the transactions even no new transaction.
          this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        }
      }
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let result = await this.jsonRPCService.eth_getTransactionByHash(this.id as StandardCoinName, txid);
      if (!result) {
        // Remove error transaction.
        await this.removeInvalidTransaction(txid);
      }
      return result;
    }

    /**
     * Use smartcontract to Send ELA from ETHSC to mainchain.
     */
    // public getWithdrawContractAddress() {
    //     return this.withdrawContractAddress;
    // }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        if (transaction.isError && transaction.isError != '0') {
          return null;
        }

        transaction.to = transaction.to.toLowerCase();

        const timestamp = parseInt(transaction.timeStamp) * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const direction = await this.getETHSCTransactionDirection(transaction.to);
        transaction.Direction = direction;

        const isERC20TokenTransfer = await this.isERC20TokenTransfer(transaction.to);
        transaction.isERC20TokenTransfer = isERC20TokenTransfer;
        let erc20TokenTransactionInfo: ERC20TokenTransactionInfo = null;
        if (isERC20TokenTransfer) {
          erc20TokenTransactionInfo = this.getERC20TokenTransactionInfo(transaction)
        }

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(-1),
            confirmStatus: parseInt(transaction.confirmations),
            datetime,
            direction: direction,
            fee: '0',
            height: parseInt(transaction.blockNumber),
            memo: '',
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
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
        };

        transactionInfo.amount = new BigNumber(transaction.value).dividedBy(Config.WEI);
        transactionInfo.fee = new BigNumber(transaction.gas).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(Config.WEI).toString();

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

        // TODO improve it
        if ((transaction.transferType === ETHSCTransferType.DEPOSIT) || (transactionInfo.name === "wallet.coin-dir-to-mainchain")) {
          transactionInfo.isCrossChain = true;
        }

        return transactionInfo;
    }

    protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.to);
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
    }

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
      return await '';
    }
}
