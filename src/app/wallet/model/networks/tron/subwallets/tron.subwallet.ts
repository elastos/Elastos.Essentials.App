import BigNumber from 'bignumber.js';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { TRC20CoinService } from 'src/app/wallet/services/tvm/trc20coin.service';
import { StandardCoinName } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { TimeBasedPersistentCache } from '../../../timebasedpersistentcache';
import { ResourceType, TronTransaction } from '../../../tron.types';
import { TransactionDirection, TransactionInfo, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../base/subwallets/maincoin.subwallet';
import { ETHOperationType, ETHTransactionInfo, ETHTransactionInfoParser } from '../../evms/ethtransactioninfoparser';
import { TronSafe } from '../safes/tron.safe';

const TRANSACTION_LIMIT = 100;

export class TronSubWallet extends MainCoinSubWallet<TronTransaction, any> {
    private tronAddress: string = null;

    private stakedBalanceCache: TimeBasedPersistentCache<any> = null;
    private stakedBalanceKeyInCache = null;
    private stakedBalance = 0;

    private txInfoParser: ETHTransactionInfoParser;

    constructor(networkWallet: AnyNetworkWallet, public rpcApiUrl: string) {
        super(networkWallet, StandardCoinName.TRON);

        this.tokenDecimals = 6;
        this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals);

        this.getRootPaymentAddress();

        this.txInfoParser = new ETHTransactionInfoParser(this.networkWallet.network);
    }

    public async initialize(): Promise<void> {
        super.initialize();

        await this.loadStakedBalanceFromCache();
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
        // Use extended info is there is some
        let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.txID);
        if (extInfo && extInfo.evm && extInfo.evm.txInfo && extInfo.evm.txInfo.operation)
            return GlobalTranslationService.instance.translateInstant(extInfo.evm.txInfo.operation.description, extInfo.evm.txInfo.operation.descriptionTranslationParams);

        switch (transaction.direction) {
            case TransactionDirection.RECEIVED:
                if ((transaction.raw_data.contract[0].type === 'UnfreezeBalanceContract')
                    || (transaction.raw_data.contract[0].type === 'UnfreezeBalanceV2Contract')) {
                    return "wallet.coin-op-unfreeze";
                }
                switch (transaction.raw_data.contract[0].type) {
                    case 'UnfreezeBalanceContract':
                    case 'UnfreezeBalanceV2Contract':
                      return "wallet.coin-op-unfreeze";
                    case "WithdrawExpireUnfreezeContract":
                      return "wallet.coin-op-withdraw";
                    default:
                      return await "wallet.coin-op-received-token";
                }
            case TransactionDirection.SENT:
                if ((transaction.raw_data.contract[0].type === 'FreezeBalanceContract')
                    || (transaction.raw_data.contract[0].type === 'FreezeBalanceV2Contract')) {
                    return "wallet.coin-op-freeze";
                }
                //AssetIssueContract
                //TransferAssetContract
                //TriggerSmartContract
                return "wallet.coin-op-sent-token";
            case TransactionDirection.MOVED:
                return "wallet.coin-op-transfered-token";
            default:
                return "Invalid";
        }
    }

    private getTransactionResourcesConsumed(transaction: TronTransaction) {
        let resourcesString = '';

        if (transaction.net_usage) {
            resourcesString += transaction.net_usage + ' ' + GlobalTranslationService.instance.translateInstant('wallet.tx-info-resource-bandwidth');
        }

        if (transaction.energy_usage_total) {
            if (resourcesString.length) resourcesString += ',    ';

            resourcesString += transaction.energy_usage_total + ' ' + GlobalTranslationService.instance.translateInstant('wallet.tx-info-resource-energy')
        }

        return resourcesString;
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
            subOperations: [],
            resources: this.getTransactionResourcesConsumed(transaction),
        };

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

        if (transaction.ret[0].contractRet != 'SUCCESS') {
            transactionInfo.statusName = transaction.ret[0].contractRet;
            transactionInfo.status = 'incomplete';
        } else {
            transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
            transactionInfo.status = 'confirmed';
        }

        // Get the withdraw amount.
        if (transaction.raw_data.contract[0].type == "WithdrawExpireUnfreezeContract") {
            let extInfo = await this.networkWallet.getOrFetchExtendedTxInfo(transaction.txID);
            if (extInfo && extInfo.tvm && extInfo.tvm.txInfo) {
                transactionInfo.amount = new BigNumber(extInfo.tvm.txInfo.withdraw_expire_amount).dividedBy(this.tokenAmountMulipleTimes);
            }
        }

        if (transaction.raw_data.contract[0].parameter.value.data) {
            let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.txID);
            if (!extInfo || !extInfo.evm || !extInfo.evm.txInfo) {
                let txInfo: ETHTransactionInfo = {
                    type: null,
                    operation: null,
                    events: []
                };
                let txData = transaction.raw_data.contract[0].parameter.value.data;
                await this.txInfoParser.computeOperation(this, txInfo, txData.startsWith('0x') ? txData : '0x'+txData, transaction.to);

                if (!extInfo) {
                    extInfo = {
                        evm : null
                    }
                }

                extInfo.evm = {
                    transactionReceipt: null,
                    txInfo: txInfo
                }

                await this.networkWallet.saveExtendedTxInfo(transaction.txID, extInfo);
                transactionInfo.name = await this.getTransactionName(transaction);
            }
        }
        return transactionInfo;
    }

    // eslint-disable-next-line require-await
    protected async getTransactionIconPath(transaction: TronTransaction): Promise<string> {
        if (transaction.ret[0].contractRet != 'SUCCESS') {
            return './assets/wallet/tx/error.svg';
        }

        // Use extended info is there is some
        let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.txID);
        if (extInfo && extInfo.evm && extInfo.evm.txInfo && extInfo.evm.txInfo.operation) {
            switch (extInfo.evm.txInfo.type) {
                case ETHOperationType.ERC20_TOKEN_APPROVE: return '/assets/wallet/tx/approve-token.svg';
                case ETHOperationType.ERC721_TOKEN_APPROVE: return '/assets/wallet/tx/approve-token.svg';
                case ETHOperationType.SEND_NFT: return '/assets/wallet/tx/send-nft.svg';
                case ETHOperationType.SWAP: return '/assets/wallet/tx/swap-tokens.svg';
                case ETHOperationType.ADD_LIQUIDITY: return '/assets/wallet/tx/add-liquidity.svg';
                case ETHOperationType.REMOVE_LIQUIDITY: return '/assets/wallet/tx/remove-liquidity.svg';
                case ETHOperationType.BRIDGE: return '/assets/wallet/tx/bridge.svg';
                case ETHOperationType.WITHDRAW: return '/assets/wallet/tx/withdraw.svg';
                case ETHOperationType.DEPOSIT: return '/assets/wallet/tx/deposit.svg';
                case ETHOperationType.GET_REWARDS: return '/assets/wallet/tx/get-rewards.svg';
                case ETHOperationType.STAKE: return '/assets/wallet/tx/stake.svg';
            }
        }

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

    // Get staked balance, the unit is TRX.
    public async getStakedBalance() {
        return this.stakedBalance;
    }

    /**
     * Check whether the available balance is enough.
     * @param amount unit is sun
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        return await this.balance.gt(amount);
    }

    public async estimateTransferTransactionGas(toAddress: string) {
        if (toAddress) {
            let accountInfo = await GlobalTronGridService.instance.account(this.rpcApiUrl, toAddress);
            if (accountInfo && !accountInfo.create_time) {
                // the toAddress is not activated.
                return await GlobalTronGridService.instance.getActiveAccountFee();
            }
        }

        // 300 is enough.
        return await GlobalTronGridService.instance.calculateFee(this.tronAddress, 300, 0);
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
    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = ""): Promise<any> {
        if (amount.eq(-1)) {//-1: send all.
            let fee = await this.estimateTransferTransactionGas(toAddress);
            amount = this.balance.minus(fee);
        } else {
            amount = amount.multipliedBy(this.tokenAmountMulipleTimes);
        }
        return (this.networkWallet.safe as unknown as TronSafe).createTransferTransaction(toAddress, amount.toFixed());
    }

    public async createStakeTransaction(amount: number, resource: ResourceType): Promise<any> {
        return await GlobalTronGridService.instance.freezeBalanceV2(amount, resource, this.tronAddress);
    }

    // the staked TRX can be redeemed using the unstaking method of Stake 1.0.
    public async createUnStakeV1Transaction(resource: ResourceType): Promise<any> {
        return await GlobalTronGridService.instance.unfreezeBalance(resource, this.tronAddress);
    }

    public async createUnStakeTransaction(amount: number, resource: ResourceType): Promise<any> {
        return await GlobalTronGridService.instance.unfreezeBalanceV2(amount, resource, this.tronAddress);
    }

    public async createWithdrawExpireUnfreezeTransaction(): Promise<any> {
      return await GlobalTronGridService.instance.withdrawExpireUnfreeze(this.tronAddress);
  }

    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        return await this.sendRawTransaction(transaction);
    }

    protected async sendRawTransaction(payload: string) {
        return await GlobalTronGridService.instance.sendrawtransaction(this.rpcApiUrl, payload);
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

            // Frozen balance
            let frozenBalance = 0;
            // Stake V1
            if (accountInfo.frozen && accountInfo.frozen[0]) {
                frozenBalance += accountInfo.frozen[0].frozen_balance;
            }
            if (accountInfo.account_resource && accountInfo.account_resource.frozen_balance_for_energy) {
                frozenBalance += accountInfo.account_resource.frozen_balance_for_energy.frozen_balance;
            }
            // Stake V2
            if (accountInfo.frozenV2) {
                accountInfo.frozenV2.forEach( f => {
                    let index = -1;
                    if (!f.type && f.amount) {
                        index = 0;// bandwidth
                    } else if (f.type == 'ENERGY' && f.amount) {
                        index = 1;
                    }
                    if (index != -1) {
                        frozenBalance += f.amount;
                    }
                })
            }

            if (frozenBalance) {
                this.stakedBalance = GlobalTronGridService.instance.fromSun(frozenBalance);
            } else this.stakedBalance = 0;

            this.saveStakedBalanceToCache();

            // TRC20
            if (accountInfo.trc20?.length > 0) {
                let coinInfos = await TRC20CoinService.instance.getCoinInfos(this.networkWallet.network, accountInfo.trc20);
                await this.networkWallet.getTransactionDiscoveryProvider().onTRCTokenInfoFound(coinInfos);
            }
            // TRC10
        }
    }

    private async loadStakedBalanceFromCache() {
        if (!this.stakedBalanceKeyInCache) {
            this.stakedBalanceKeyInCache = this.masterWallet.id + '-' + this.getUniqueIdentifierOnNetwork() + '-stakedbalance';
        }
        this.stakedBalanceCache = await TimeBasedPersistentCache.loadOrCreate(this.stakedBalanceKeyInCache);
        if (this.stakedBalanceCache.size() !== 0) {
            this.stakedBalance = parseFloat(this.stakedBalanceCache.values()[0].data);
        }
    }

    public async saveStakedBalanceToCache(): Promise<void> {
        const timestamp = (new Date()).valueOf();
        this.stakedBalanceCache.set('stakedbalance', this.stakedBalance, timestamp);
        await this.stakedBalanceCache.save();
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
