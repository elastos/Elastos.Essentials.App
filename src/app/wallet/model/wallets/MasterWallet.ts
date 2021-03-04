import { SubWallet, SerializedSubWallet  } from './SubWallet';
import { WalletAccount, WalletAccountType } from '../WalletAccount';
import { WalletManager } from '../../services/wallet.service';
import { StandardSubWallet } from './StandardSubWallet';
import { ERC20SubWallet } from './ERC20SubWallet';
import { Coin, CoinID, CoinType, ERC20Coin, StandardCoinName } from '../Coin';
import { CoinService } from '../../services/coin.service';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import { StandardSubWalletBuilder } from './StandardSubWalletBuilder';
import { ETHChainSubWallet } from './ETHChainSubWallet';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

export type WalletID = string;

export type Theme = {
    background: string,
    color: string
};

export class ExtendedWalletInfo {
    /** User defined wallet name */
    name: string;
    /** List of serialized subwallets added earlier to this master wallet */
    subWallets: SerializedSubWallet[] = [];
    /* Wallet theme */
    theme: Theme;
}

export class MasterWallet {

    public id: string = null;
    public name: string = null;
    public theme: Theme = null;

    public subWallets: {
        [k: string]: SubWallet
    } = {};

    public account: WalletAccount = {
        Type: WalletAccountType.STANDARD,
        SingleAddress: false
    };

    constructor(
        public walletManager: WalletManager,
        public coinService: CoinService,
        id: string,
        name?: string,
        theme?: Theme
    ) {
        this.id = id;
        this.name = name || 'Anonymous Wallet';
        this.theme = theme || {
            color: '#752fcf',
            background: '/assets/wallet/cards/maincards/card-purple.svg'
        };
    }

    public getExtendedWalletInfo(): ExtendedWalletInfo {
        let extendedInfo = new ExtendedWalletInfo();

        extendedInfo.name = this.name;
        extendedInfo.theme = this.theme;

        for (let subWallet of Object.values(this.subWallets)) {
            extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
        }
        return extendedInfo;
    }

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    public async populateWithExtendedInfo(extendedInfo: ExtendedWalletInfo) {
        console.log("Populating master wallet with extended info", this.id);

        // Retrieve wallet account type
        this.account = await this.walletManager.spvBridge.getMasterWalletBasicInfo(this.id);

        // In case of newly created wallet we don't have extended info from local storag yet,
        // which is normal.
        if (extendedInfo) {
            this.name = extendedInfo.name;
            this.theme = extendedInfo.theme;

            this.subWallets = {};
            for (let serializedSubWallet of extendedInfo.subWallets) {
                let subWallet = SubWalletBuilder.newFromSerializedSubWallet(this, serializedSubWallet);
                if (subWallet) {
                    this.subWallets[serializedSubWallet.id] = subWallet;
                }
            }
        }
    }

    public getDisplayBalance(): BigNumber {
        // Sum all subwallets balances to get the master wallet total balance
        // Only standard ELA wallets are summed up as ERC20 wallets amounts use their own currency
        // and canno't be stacked on top of ELA as we don't have a exchange rate for now.
        let balance = new BigNumber(0);
        for (let subWallet of Object.values(this.subWallets)) {
            if (subWallet instanceof StandardSubWallet)
                balance = balance.plus(subWallet.balance);
        }

        return balance.dividedBy(Config.SELAAsBigNumber);
    }

    public async updateBalance() {
        for (let subWallet of Object.values(this.subWallets)) {
            await subWallet.updateBalance();
        }
    }

    /**
     * Requests a wallet to update its sync progress. Call this only for SPV SDK sub-wallets.
     */
    public updateSyncProgress(chainId: StandardCoinName, progress: number, lastBlockTime: number) {
        const subWallet = this.subWallets[chainId] as StandardSubWallet;
        if (subWallet) {
            subWallet.updateSyncProgress(progress, lastBlockTime);
        }
    }

    public getSubWalletBalance(coinId: CoinID): BigNumber {
        return this.subWallets[coinId].balance;
    }

    public hasSubWallet(coinId: CoinID): boolean {
        return coinId in this.subWallets;
    }

    /**
     * Returns the list of all subwallets except the excluded one.
     */
    public subWalletsWithExcludedCoin(excludedCoinName: StandardCoinName, type: CoinType = null): SubWallet[] {
        return Object.values(this.subWallets).filter((sw)=>{
            return (sw.id !== excludedCoinName) && (type !== null ? sw.type === type : true);
        });
    }

    /**
     * Adds a new subwallet to this master wallet, based on a given coin type.
     */
    public async createSubWallet(coin: Coin) {
        this.subWallets[coin.getID()] = await SubWalletBuilder.newFromCoin(this, coin);

        console.log("Created subwallet with id "+coin.getID()+" for wallet "+this.id);

        await this.walletManager.saveMasterWallet(this);
    }

    /**
     * Removes a subwallet (coin - ex: ela, idchain) from the given wallet.
     */
    public async destroySubWallet(coinId: CoinID) {
        let subWallet = this.subWallets[coinId];
        subWallet.destroy();

        // Delete the subwallet from out local model.
        delete this.subWallets[coinId];

        await this.walletManager.saveMasterWallet(this);
    }

    /**
     * Convenient method to access subwallets as an array alphabetically.
     */
    public getSubWallets(): SubWallet[] {
        return Object.values(this.subWallets).sort((a, b) => a.getFriendlyName() > b.getFriendlyName() ? 1 : -1);
    }

    public getSubWallet(id: CoinID): SubWallet {
        return this.subWallets[id];
    }

    /**
     * Returns the list of all subwallets by CoinType
     */
    public getSubWalletsByType(type: CoinType): SubWallet[] {
        return Object.values(this.subWallets).filter((sw)=>{
            return (sw.type === type);
        });
    }

    /**
     * Get all the tokens, and create the subwallet.
     */
    public async updateERC20TokenList(prefs: GlobalPreferencesService) {
        if (!this.subWallets[StandardCoinName.ETHSC]) {
            console.log('updateERC20TokenList no ETHSC');
            return;
        }

        const activeNetwork = await prefs.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);
        const erc20TokenList = await (this.subWallets[StandardCoinName.ETHSC] as ETHChainSubWallet).getERC20TokenList();
        erc20TokenList.forEach( async (token: WalletPlugin.ERC20TokenInfo) => {
            if (token.symbol && token.name) {
                if (!this.subWallets[token.symbol] && !this.coinService.isCoinDeleted(token.contractAddress)) {
                    try {
                        const erc20Coin = this.coinService.getERC20CoinByContracAddress(token.contractAddress);
                        if (erc20Coin) {
                            await this.createSubWallet(erc20Coin);
                        } else {
                            const newCoin = new ERC20Coin(token.symbol, token.symbol, token.name, token.contractAddress, activeNetwork, true);
                            await this.coinService.addCustomERC20Coin(newCoin, this);
                        }
                    } catch (e) {
                        console.log('updateERC20TokenList exception:', e);
                    }
                }
            } else {
                console.error('Token has no name or symbol:', token);
            }
        });
    }
}

class SubWalletBuilder {
    /**
     * Newly created wallet, base on a coin type.
     */
    static newFromCoin(masterWallet: MasterWallet, coin: Coin): Promise<SubWallet> {
        console.log("Creating new subwallet using coin", coin);

        switch (coin.getType()) {
            case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromCoin(masterWallet, coin);
            case CoinType.ERC20:
                return ERC20SubWallet.newFromCoin(masterWallet, coin);
            default:
                console.warn("Unsupported coin type", coin.getType());
                break;
        }
    }

    /**
     * Restored wallet from local storage info.
     */
    static newFromSerializedSubWallet(masterWallet: MasterWallet, serializedSubWallet: SerializedSubWallet): SubWallet {
        switch (serializedSubWallet.type) {
            case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromSerializedSubWallet(masterWallet, serializedSubWallet);
            case CoinType.ERC20:
                return ERC20SubWallet.newFromSerializedSubWallet(masterWallet, serializedSubWallet);
            default:
                console.warn("Unsupported subwallet type", serializedSubWallet.type);
                break;
        }
    }
}