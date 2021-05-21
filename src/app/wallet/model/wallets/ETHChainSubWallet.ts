import { StandardSubWallet } from './StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, EthTransaction, TransactionDetail, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../Transaction';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';

declare let walletManager: WalletPlugin.WalletManager;

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ETHChainSubWallet extends StandardSubWallet {
    private ethscAddress: string = null;
    private withdrawContractAddress: string = null;
    private web3 = null;
    private timestampGetBalance = 0;

    constructor(masterWallet: MasterWallet) {
        super(masterWallet, StandardCoinName.ETHSC);

        this.getWithdrawContractAddress();
        this.initWeb3();
    }

    public async getTokenAddress(): Promise<string> {
        if (!this.ethscAddress) {
            this.ethscAddress = await this.createAddress();
        }
        return this.ethscAddress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
      // TODO
      return null;
    }

    public async getTransactionDetails(txid: string): Promise<TransactionDetail> {
      let transactionDetails// = await this.masterWallet.walletManager.spvBridge.getTokenTransactions(this.masterWallet.id, 0, txid, this.id);
      return transactionDetails;
    }

    /**
     * Use smartcontract to Send ELA from ETHSC to mainchain.
     */
    public getWithdrawContractAddress(): Promise<string> {
        return new Promise(async (resolve) => {
            if (this.withdrawContractAddress) {
                resolve(this.withdrawContractAddress);
            } else {
                let value = await GlobalPreferencesService.instance.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'chain.network.type');
                if (value === 'MainNet') {
                    this.withdrawContractAddress = Config.CONTRACT_ADDRESS_MAINNET;
                    resolve(this.withdrawContractAddress);
                } else if (value === 'TestNet') {
                    this.withdrawContractAddress = Config.CONTRACT_ADDRESS_TESTNET;
                    resolve(this.withdrawContractAddress);
                } else {
                    resolve(null);
                }
            }
        });
    }

    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        const transactionInfo = await super.getTransactionInfo(transaction, translate);
        const direction = await this.getETHSCTransactionDirection(transaction.address);

        // TODO: Why BlockNumber is 0 sometimes? Need to check.
        // if (transaction.IsErrored || (transaction.BlockNumber === 0)) {
        // if (transaction.IsErrored) {
        //     return null;
        // }
        // TODO
        // transactionInfo.amount = new BigNumber(transaction.Amount).dividedBy(Config.WEI);
        // transactionInfo.fee = transaction.Fee / Config.WEI;
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

    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        const direction = await this.getETHSCTransactionDirection(transaction.address);
        // TODO
        // switch (direction) {
        //     case TransactionDirection.RECEIVED:
        //         return "wallet.coin-op-received-token";
        //     case TransactionDirection.SENT:
        //         if (transaction.Amount !== '0') {
        //             return "wallet.coin-op-sent-token";
        //         } else {
        //             // Contract
        //             return this.getETHSCTransactionContractType(transaction, translate);
        //         }
        // }
        return null;
    }

    protected async getTransactionIconPath(transaction: TransactionHistory): Promise<string> {
        const direction = await this.getETHSCTransactionDirection(transaction.address);
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
            return translate.instant("wallet.coin-op-contract-token-transfer");
        } else if (transaction.TargetAddress === '') {
            return translate.instant("wallet.coin-op-contract-create");
        } else if (transaction.TargetAddress === '0x0000000000000000000000000000000000000000') {
            return translate.instant("coin-op-contract-destroy");
        } else if (transaction.TargetAddress === this.withdrawContractAddress) {
            // withdraw to MainChain
            // no TokenFunction
            return translate.instant("wallet.coin-dir-to-mainchain");
        } else {
            return translate.instant("wallet.coin-op-contract-call");
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
        // TODO: the ethsc has no lastBlockTime, and there is a bug for ethsc sync progress.
        // so get balance by web3
        // if we can get the lastBlockTime from spvsdk, then we can get balance by spvsdk.
        const curTimestampMs = (new Date()).getTime();
        const timeInverval = curTimestampMs - this.timestampGetBalance;
        if (timeInverval > 30000) { // 30s
            this.balance = await this.getBalanceByWeb3();
            this.timestampGetBalance = (new Date()).getTime();
        }
        // const balanceStr = await this.masterWallet.walletManager.spvBridge.getBalance(this.masterWallet.id, this.id);
        // // TODO: use Ether? Gwei? Wei?
        // this.balance = new BigNumber(balanceStr).multipliedBy(Config.SELAAsBigNumber);
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
        const contractAddress = await this.getWithdrawContractAddress();
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

    /**
     * Returns the current gas price on chain.
     */
    public getGasPrice(): Promise<BigNumber> {
        return this.web3.eth.getGasPrice();
    }
}
