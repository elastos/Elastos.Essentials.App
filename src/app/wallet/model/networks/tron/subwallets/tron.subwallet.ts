import BigNumber from 'bignumber.js';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { TRC20CoinService } from 'src/app/wallet/services/tvm/trc20coin.service';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { TronTransaction } from '../../../tron.types';
import { TransactionDirection, TransactionInfo, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { TronSafe } from '../safes/tron.safe';

const TRANSACTION_LIMIT = 100;

export class TronSubWallet extends MainCoinSubWallet<TronTransaction, any> {
    private tronAddress: string = null;

    constructor(networkWallet: AnyNetworkWallet, public rpcApiUrl: string) {
        super(networkWallet, StandardCoinName.TRON);

        this.tokenDecimals = 6;
        this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals);

        this.getRootPaymentAddress();
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            await this.updateBalance();
        }, 1000);
    }

    public getMainIcon(): string {
        return this.networkWallet.network.logo;
    }

    public getSecondaryIcon(): string {
        return null
    }

    public getFriendlyName(): string {
        return 'TRX';
    }

    public getDisplayTokenName(): string {
        return 'TRX';
    }

    public async isAddressValid(address: string): Promise<boolean> {
        return await WalletUtil.isTronAddress(address);
    }

    public getRootPaymentAddress(): string {
        if (!this.tronAddress) {
            this.tronAddress = this.getCurrentReceiverAddress();
        }
        return this.tronAddress;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        return Promise.resolve([]);
    }

    protected async getTransactionName(transaction: TronTransaction): Promise<string> {
        switch (transaction.direction) {
            case TransactionDirection.RECEIVED:
                return await "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return "wallet.coin-op-sent-token";
            case TransactionDirection.MOVED:
                return "wallet.coin-op-transfered-token";
            default:
                return "Invalid";
        }
    }

    public getAddressCount(internal: boolean): number {
        if (internal) return 0;
        else return 1;
    }

    public async getTransactionInfo(transaction: TronTransaction): Promise<TransactionInfo> {
        const timestamp = transaction.block_timestamp;
        const datetime = timestamp === 0 ? GlobalTranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

        const direction = transaction.direction;

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(transaction.value).dividedBy(this.tokenAmountMulipleTimes),
            confirmStatus: -1, // transaction.confirmations, // To reduce RPC calls, we do not update this value
            datetime,
            direction: direction,
            fee: (new BigNumber(transaction.ret[0].fee).dividedBy(this.tokenAmountMulipleTimes)).toFixed(),
            height: transaction.blockNumber,
            memo: '',
            name: await this.getTransactionName(transaction),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: '',
            statusName: "",
            symbol: '',
            from: transaction.from,
            to: transaction.to,
            timestamp,
            txid: transaction.txID,
            type: null,
            isCrossChain: false,
            isRedPacket: false,
            subOperations: []
        };

        // if (transaction.confirmations > 0) {
        //     transactionInfo.status = TransactionStatus.CONFIRMED;
        //     transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
        // } else {
        //     transactionInfo.status = TransactionStatus.PENDING;
        //     transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-pending");
        // }

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

    // eslint-disable-next-line require-await
    protected async getTransactionIconPath(transaction: TronTransaction): Promise<string> {
        switch (transaction.direction) {
            case TransactionDirection.RECEIVED:
                return './assets/wallet/tx/receive.svg';
            case TransactionDirection.SENT:
                return './assets/wallet/tx/send.svg';
            case TransactionDirection.MOVED:
                return './assets/wallet/tx/transfer.svg';
        }
    }

    public async update() {
        await this.getBalanceByRPC();
    }

    public async updateBalance() {
        await this.getBalanceByRPC();
    }


    /**
     * Check whether the available balance is enough.
     * @param amount unit is sun
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        return await this.balance.gt(amount);
    }

    public async estimateTransferTransactionGas(toAddress: string) {
        let accountInfo = await GlobalTronGridService.instance.account(this.rpcApiUrl, toAddress);
        if (accountInfo && !accountInfo.create_time) {
            // the toAddress is not activated.
            return 1100000;
        }

        let usableBandwidth = 0;
        let res = await GlobalTronGridService.instance.getAccountResource(this.tronAddress);
        if (!res || !res.freeNetLimit) return usableBandwidth;

        usableBandwidth = res.freeNetLimit + (res.NetLimit ? res.NetLimit : 0)
                        - (res.NetUsed ? res.NetUsed : 0) - (res.freeNetUsed ? res.freeNetUsed : 0);
        // 300 is enough.
        if (usableBandwidth > 300) return 0;
        else return 30000;
    }

    // Fees paid by transaction senders/sending addresses:
    // Use tronWeb.trx.getChainParameters();
    // 1. Issue a TRC10 token: 1,024 TRX
    // 2. Apply to be an SR candidate: 9,999 TRX
    // 3. Create a Bancor transaction: 1,024 TRX
    // 4. Update the account permission: 100 TRX
    // 5. Activate the account: 1 TRX
    // 6. Multi-sig transaction: 1 TRX
    // 7. Transaction note: 1 TRX
    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = ""): Promise<string> {
        if (amount.eq(-1)) {//-1: send all.
            let fee = await this.estimateTransferTransactionGas(toAddress);
            amount = this.balance.minus(fee);
        } else {
            amount = amount.multipliedBy(this.tokenAmountMulipleTimes);
        }
        return (this.networkWallet.safe as unknown as TronSafe).createTransferTransaction(toAddress, amount.toFixed());
    }

    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        return await this.sendRawTransaction(transaction);
    }

    protected async sendRawTransaction(payload: string) {
        return GlobalTronGridService.instance.sendrawtransaction(this.rpcApiUrl, payload)
    }

    // ********************************
    // Private
    // ********************************

    /**
     * Get balance by RPC
     */
    public async getBalanceByRPC() {
        await this.updateTronSubWalletInfo();
    }

    /**
     * Update balance and token list.
     */
    private async updateTronSubWalletInfo() {
        let accountInfo = await GlobalTronGridService.instance.account(this.rpcApiUrl, this.tronAddress);
        // accountInfo is {} if the account is not activated.
        if (accountInfo) {
            if (accountInfo.balance) {
                this.balance = new BigNumber(accountInfo.balance);
                await this.saveBalanceToCache();
            } else {
                this.balance = new BigNumber(0);
            }

            // TRC20
            if (accountInfo.trc20?.length > 0) {
                let coinInfos = await TRC20CoinService.instance.getCoinInfos(this.networkWallet.network, accountInfo.trc20);
                await this.networkWallet.getTransactionDiscoveryProvider().onTRCTokenInfoFound(coinInfos);
            }
            // TRC10
        }
    }

    async getTransactionDetails(txid: string): Promise<any> {
        return null;
    }

    public getAvailableEarnProviders(): EarnProvider[] {
        return [];
    }

    public getAvailableSwapProviders(): SwapProvider[] {
        return [];
    }

    public getAvailableBridgeProviders(): BridgeProvider[] {
        return [];
    }
}
