import BigNumber from 'bignumber.js';
import { Subject } from 'rxjs';
import { lazyTronWebImport } from 'src/app/helpers/import.helper';
import { runDelayed, sleep } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { BridgeService } from 'src/app/wallet/services/evm/bridge.service';
import { EarnService } from 'src/app/wallet/services/evm/earn.service';
import { SwapService } from 'src/app/wallet/services/evm/swap.service';
import { OutgoingTransactionState, TransactionService } from 'src/app/wallet/services/transaction.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Coin, CoinID, CoinType, TRC20Coin } from '../../../coin';
import { BridgeProvider } from '../../../earn/bridgeprovider';
import { EarnProvider } from '../../../earn/earnprovider';
import { SwapProvider } from '../../../earn/swapprovider';
import { ExtendedTransactionInfo } from '../../../extendedtxinfo';
import type { MasterWallet } from '../../../masterwallets/masterwallet';
import type { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { TronTRC20Transaction, TronTransactionInfo } from '../../../tron.types';
import { TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../tx-providers/transaction.types';
import { WalletUtil } from '../../../wallet.util';
import { AnyNetworkWallet } from '../../base/networkwallets/networkwallet';
import { SerializedSubWallet, SubWallet } from '../../base/subwallets/subwallet';
import { TronNetworkBase } from '../network/tron.base.network';
import { AnyTronNetworkWallet, TronNetworkWallet } from '../networkwallets/tron.networkwallet';

export class TRC20SubWallet extends SubWallet<TronTRC20Transaction, any> {
    private network: TronNetworkBase;
    /** Coin related to this wallet */
    public coin: TRC20Coin;

    private tokenAddress = '';

    private tronWeb = null;
    private contractHandler = null;
    private contractEnergyFactor = -1;

    protected spvConfigEVMCode: string = null; // Ex: ETHHECO, ETHSC
    private fetchTokenValueTimer: any = null;
    // protected txInfoParser: ETHTransactionInfoParser;

    public static async newFromCoin(networkWallet: TronNetworkWallet<MasterWallet, WalletNetworkOptions>, coin: Coin): Promise<TRC20SubWallet> {
        const subWallet = await networkWallet.network.createTRC20SubWallet(networkWallet, coin.getID());
        return subWallet;
    }

    public static async newFromSerializedSubWallet(networkWallet: AnyTronNetworkWallet, serializedSubWallet: SerializedSubWallet): Promise<TRC20SubWallet> {
        //Logger.log('wallet', "Initializing ERC20 subwallet from serialized sub wallet", serializedSubWallet);
        if (!serializedSubWallet.id) {
            Logger.error('wallet', 'newFromSerializedSubWallet id is null');
            return null;
        }
        // Use the contract address as id for TRC20 subwallet.
        const coin = networkWallet.network.getTRC20CoinByContractAddress(serializedSubWallet.id) as TRC20Coin;
        if (coin) {
            const subWallet = await networkWallet.network.createTRC20SubWallet(networkWallet, serializedSubWallet.id, false);
            return subWallet;
        } else {
            Logger.error('wallet', 'newFromSerializedSubWallet error, this coin is not a known coin for this network.');
            return null;
        }
    }

    public constructor(
        public networkWallet: AnyNetworkWallet,
        id: CoinID,
        private rpcApiUrl: string,
        protected displayableERC20TokenInfo = 'Tron TRC20 Token'
    ) {
        super(networkWallet, id, CoinType.TRC20);

        this.network = <TronNetworkBase>networkWallet.network;
    }

    public async initialize(): Promise<void> {
        this.coin = this.network.getCoinByID(this.id) as TRC20Coin;
        this.tokenDecimals = this.coin.decimals;
        this.tokenAmountMulipleTimes = new BigNumber(10).pow(this.tokenDecimals);
        const TronWeb = await lazyTronWebImport();
        this.tronWeb = new TronWeb({
            fullHost: this.rpcApiUrl
        })
        this.contractHandler = await this.tronWeb.contract().at(this.coin.trc20ContractAddress);
        this.tronWeb.setAddress(this.coin.trc20ContractAddress);

        await super.initialize();
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();
        // void this.fetchAndRearmTokenValue();

        runDelayed(() => this.updateBalance(), 5000);
        return;
    }

    public async stopBackgroundUpdates(): Promise<void> {
        await super.stopBackgroundUpdates();
        clearTimeout(this.fetchTokenValueTimer);
        return;
    }

    public getCoin(): TRC20Coin {
        return this.coin;
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

    private async fetchAndRearmTokenValue(): Promise<void> {
        await this.fetchTokenValue();

        this.fetchTokenValueTimer = setTimeout(() => {
            void this.fetchAndRearmTokenValue();
        }, 60000);
    }

    private async fetchTokenValue(): Promise<void> {
        // await CurrencyService.instance.fetchERC20TokenValue(this.coin, this.network);
    }

    public getUniqueIdentifierOnNetwork(): string {
        return this.coin.getContractAddress();
    }

    public createAddress(): string {
        // Create on ETH always returns the same unique address.
        let addresses = this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.EVM_CALL);
        return (addresses && addresses[0]) ? addresses[0] : null;
    }

    public getTokenAccountAddress(): string {
        if (!this.tokenAddress) {
            this.tokenAddress = this.getCurrentReceiverAddress();
        }
        return this.tokenAddress;
    }

    public getFriendlyName(): string {
        const coin = this.network.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getDescription();
    }

    public getDisplayTokenName(): string {
        const coin = this.network.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }
        return coin.getSymbol();
    }

    public isAddressValid(address: string): Promise<boolean> {
        return WalletUtil.isTronAddress(address);
    }

    public transactionsListChanged(): Subject<void> {
        return this.networkWallet.getTransactionDiscoveryProvider().transactionsListChanged(this.getUniqueIdentifierOnNetwork());
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
        let amount = CurrencyService.instance.getERC20TokenValue(value, this.coin, this.networkWallet.network);
        if (amount) {
            let decimalplace = 3;
            if (CurrencyService.instance.selectedCurrency && CurrencyService.instance.selectedCurrency.decimalplace) {
                decimalplace = CurrencyService.instance.selectedCurrency.decimalplace;
            }
            // If the amount is less than 1, more decimal parts are displayed.
            if (!amount.isGreaterThan(1)) {
                decimalplace += 2;
            }
            return amount.decimalPlaces(decimalplace);
        } else {
            return amount;
        }
    }

    public getUSDBalance(): BigNumber {
        let usdBalance = CurrencyService.instance.getERC20TokenValue(this.getBalance(), this.coin, this.networkWallet.network, 'USD');
        return usdBalance || new BigNumber(0);
    }

    public getOneCoinUSDValue(): BigNumber {
        return CurrencyService.instance.getERC20TokenValue(new BigNumber(1), this.coin, this.networkWallet.network, 'USD');
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
     * Returns the info string to show to describe the type of TRC20 tokens held by this subwallet.
     * i.e.: "Tron TRC20 token"
     */
    public getDisplayableERC20TokenInfo(): string {
        return this.displayableERC20TokenInfo;
    }

    /**
     * Check whether the balance is enough.
     * @param amount unit is WEI
     */
    public isBalanceEnough(amount: BigNumber) {
        // The fee is TRX, not TRC20 TOKEN. So can send all the balance.
        return this.getRawBalance().gte(amount.multipliedBy(this.tokenAmountMulipleTimes));
    }

    private async getERC20TransactionDirection(targetAddress: string): Promise<TransactionDirection> {
        const address = this.getTokenAccountAddress();
        if (address === targetAddress) {
            return await TransactionDirection.RECEIVED;
        } else {
            return await TransactionDirection.SENT;
        }
    }

    public async update() {
        await this.updateBalance();
    }

    public async updateBalance(): Promise<void> {
        if (typeof (this.tokenDecimals) == "undefined" || this.tokenDecimals === null) {
            Logger.error("wallet", "Token decimals unknown for token " + this.coin.getID());
            return;
        }

        try {
            const tokenAccountAddress = this.getTokenAccountAddress();
            const rawBalance = await this.contractHandler.balanceOf(tokenAccountAddress).call();
            if (rawBalance) {
                this.balance = new BigNumber(rawBalance.toString());
                await this.saveBalanceToCache();
            }
        } catch (error) {
            Logger.warn('wallet', 'TRC20 Token (', this.coin.getSymbol(), this.id, ') updateBalance error:', error);
        }
    }

    public getTransactionsCacheKey(): string {
        return this.masterWallet.id + "-" + this.networkWallet.network.key + "-" + this.coin.getContractAddress() + "-transactions";
    }

    public async getTransactionByHash(hash: string): Promise<TronTRC20Transaction> {
        let transactions = await this.getTransactions();
        if (transactions) {
            let existingIndex = (transactions as TronTRC20Transaction[]).findIndex(i => i.transaction_id == hash);
            if (existingIndex >= 0) {
                return transactions[existingIndex] as TronTRC20Transaction;
            }
        }
        return null;
    }

    public async getTransactionDetails(txid: string): Promise<TronTransactionInfo> {
        return await GlobalTronGridService.instance.getTransactionInfoById(this.rpcApiUrl, txid);
    }

    public async getTransactionInfo(transaction: TronTRC20Transaction): Promise<TransactionInfo> {
        if (transaction.hide) return null;

        const timestamp = transaction.block_timestamp;
        const datetime = timestamp === 0 ? GlobalTranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);

        const direction = await this.getERC20TransactionDirection(transaction.to);
        transaction.direction = direction;

        const transactionInfo: TransactionInfo = {
            amount: this.getDisplayValue(transaction.value),
            confirmStatus: -1,
            datetime,
            direction: direction,
            fee: null,
            height: -1,
            memo: '',
            name: await this.getTransactionName(transaction),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: TransactionStatus.UNCONFIRMED,
            statusName: "",
            symbol: '',
            from: transaction.from,
            to: transaction.to,
            timestamp,
            txid: transaction.transaction_id,
            type: null,
            isCrossChain: false,
            isRedPacket: false,
            subOperations: []
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

        // Not blocking retrieval of extended transaction information
        // Call getTransactionInfoById to get more info for trc20 transaction.
        void this.networkWallet.getOrFetchExtendedTxInfo(transaction.transaction_id).then(async extInfo => {
            if (extInfo && extInfo.tvm && extInfo.tvm.txInfo) {
                if (extInfo.tvm.txInfo.fee) transactionInfo.fee = (new BigNumber(extInfo.tvm.txInfo.fee).dividedBy(this.tokenAmountMulipleTimes)).toFixed(),
                transactionInfo.resources = this.getTransactionResourcesConsumed(extInfo.tvm.txInfo);
                transactionInfo.height = extInfo.tvm.txInfo.blockNumber;

                if (extInfo.tvm.txInfo.receipt.result != 'SUCCESS') {
                    transactionInfo.statusName = extInfo.tvm.txInfo.receipt.result;
                    transactionInfo.status = 'incomplete';
                    transactionInfo.payStatusIcon = './assets/wallet/tx/error.svg';
                } else {
                    transactionInfo.statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
                    transactionInfo.status = 'confirmed';
                }
            }
        });

        return transactionInfo;
    }

    // TODO: Refine / translate with more detailed info: smart contract run, cross chain transfer or ERC payment, etc
    protected async getTransactionName(transaction: TronTRC20Transaction): Promise<string> {
        // TODO
        // Use extended info is there is some
        // let extInfo = await this.networkWallet.getExtendedTxInfo(transaction.transaction_id);
        // if (extInfo && extInfo.evm && extInfo.evm.txInfo && extInfo.evm.txInfo.operation)
        //     return GlobalTranslationService.instance.translateInstant(extInfo.evm.txInfo.operation.description, extInfo.evm.txInfo.operation.descriptionTranslationParams);

        const direction = transaction.direction ? transaction.direction : await this.getERC20TransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return "wallet.coin-op-sent-token";
            default:
                return "Invalid";
        }
    }

    private getTransactionResourcesConsumed(transaction: TronTransactionInfo) {
        let resourcesString = '';

        if (transaction.receipt.net_usage) {
            resourcesString += transaction.receipt.net_usage + ' ' + GlobalTranslationService.instance.translateInstant('wallet.tx-info-resource-bandwidth');
        }

        if (transaction.receipt.energy_usage_total) {
            if (resourcesString.length) resourcesString += ',    ';

            resourcesString += transaction.receipt.energy_usage_total + ' ' + GlobalTranslationService.instance.translateInstant('wallet.tx-info-resource-energy')
        }

        return resourcesString;
    }

    // TODO: Refine with more detailed info: smart contract run, cross chain transfer or ERC payment, etc
    protected async getTransactionIconPath(transaction: TronTRC20Transaction): Promise<string> {
        const direction = transaction.direction ? transaction.direction : await this.getERC20TransactionDirection(transaction.to);
        if (direction === TransactionDirection.RECEIVED) {
            return './assets/wallet/buttons/curcol-receive.svg';
        } else if (direction === TransactionDirection.SENT) {
            return './assets/wallet/tx/send.svg';
        } else if (direction === TransactionDirection.MOVED) {
            return './assets/wallet/tx/transfer.svg';
        }

        return null;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string, nonceArg: number): Promise<any> {
        return Promise.resolve([]);
    }

    public async estimateTransferTransactionGas() {
        const tokenAccountAddress = this.getTokenAccountAddress();
        const contractAddress = this.coin.getContractAddress();
        let result = await GlobalTronGridService.instance.triggerConstantContract(contractAddress, 100000, tokenAccountAddress);

        let howManyBandwidthNeed = result.transaction["raw_data_hex"].length;
        howManyBandwidthNeed = Math.round(howManyBandwidthNeed / 2) + 68;

        if (this.contractEnergyFactor == -1) {
            let contractInfo = await GlobalTronGridService.instance.getContractInfo(this.rpcApiUrl, contractAddress);
            if (contractInfo && contractInfo.contract_state) {
                if (contractInfo.contract_state.energy_factor) {
                    this.contractEnergyFactor = contractInfo.contract_state.energy_factor / 10000;
                } else {
                    this.contractEnergyFactor = 0;
                }
            }
        }
        let energy = Math.round(result.energy_used * (1 + this.contractEnergyFactor));

        return await GlobalTronGridService.instance.calculateFee(tokenAccountAddress, howManyBandwidthNeed, energy);
    }

    public async createPaymentTransaction(toAddress: string, amount: BigNumber, feeLimit: number = null): Promise<any> {
        toAddress = await this.networkWallet.convertAddressForUsage(toAddress, AddressUsage.EVM_CALL);

        const tokenAccountAddress = this.getTokenAccountAddress();
        const contractAddress = this.coin.getContractAddress();

        let realFeeLimit = 100000000;
        if (feeLimit && feeLimit > realFeeLimit) realFeeLimit = feeLimit;

        Logger.log('wallet', 'createPaymentTransaction toAddress:', toAddress, ' amount:', amount.toString(), ' feeLimit:', realFeeLimit);
        // Convert the Token amount (ex: 20 TTECH) to contract amount (=token amount (20) * 10^decimals)
        let amountWithDecimals: BigNumber;
        if (amount.eq(-1)) {//-1: send all.
            amountWithDecimals = this.balance;
        } else {
            amountWithDecimals = new BigNumber(amount).multipliedBy(this.tokenAmountMulipleTimes);
        }

        let result = await this.tronWeb.transactionBuilder.triggerSmartContract(
            contractAddress, 'transfer(address,uint256)', {
                feeLimit: realFeeLimit,
                callValue: 0
            },
            [{
                type: 'address',
                value: toAddress
            }, {
                type: 'uint256',
                value: amountWithDecimals.toFixed(0)
            }],
            tokenAccountAddress
        );
        if (result.result) {
            return result.transaction;
        } else {
            Logger.warn('wallet', "triggerSmartContract failed", result);
            return null;
        }
    }

    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        return await this.sendRawTransaction(transaction);
    }

    protected async sendRawTransaction(payload: string) {
        return await GlobalTronGridService.instance.sendrawtransaction(this.rpcApiUrl, payload);
    }

    public getSwapInputCurrency(): string {
        return this.coin.getContractAddress();
    }

    protected async markGenericOutgoingTransactionEnd(txid: string, message: string = '') {
        if (txid) {
            await sleep(3000);
            let extInfo = await this.checkPublicationStatus(txid);
            if (extInfo && extInfo.tvm && extInfo.tvm.txInfo && extInfo.tvm.txInfo.receipt.result !== 'SUCCESS') {
                TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.ERRORED, extInfo.tvm.txInfo.receipt.result);
            } else {
                TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.PUBLISHED);
            }
        }
        else
          TransactionService.instance.setOnGoingPublishedTransactionState(OutgoingTransactionState.ERRORED, message);
    }

    private checkPublicationStatus(txid: string): Promise<ExtendedTransactionInfo> {
        return new Promise(async (resolve) => {
            try {
                for (let i = 0; i < 10; i++) {
                    let txInfo = await this.networkWallet.getOrFetchExtendedTxInfo(txid);
                    Logger.log('wallet', 'checkPublicationStatus ', txInfo)
                    if (txInfo && txInfo.tvm) {
                        resolve(txInfo);
                        return;
                    }
                    await sleep(1000);
                }
                resolve(null);
            } catch (e) {
                setTimeout(() => {
                    resolve(null);
                }, 5000);
            }
        });
    }
}
