import BigNumber from 'bignumber.js';
import { Subject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { Config } from '../../config/Config';
import { LocalStorage } from '../../services/storage.service';
import { Coin, CoinID, CoinType, StandardCoinName } from '../Coin';
import { EthTransaction } from '../evm.types';
import { Network } from '../networks/network';
import { NFT, NFTType, SerializedNFT } from '../nfts/nft';
import { TransactionProvider } from '../providers/transaction.provider';
import { StandardEVMSubWallet } from './evm.subwallet';
import { MasterWallet } from './masterwallet';
import { SerializedSubWallet, SubWallet } from './subwallet';
import { SubWalletBuilder } from './subwalletbuilder';

export class ExtendedNetworkWalletInfo {
    /** List of serialized subwallets added earlier to this network wallet */
    subWallets: SerializedSubWallet[] = [];
    /** List of serialized NFTs added earlier to this master wallet */
    nfts: SerializedNFT[] = []; // TODO: Save each NFT's list of tokens in another storage item.
}

/**
 * A network wallet is an instance of a master wallet (one root key) for a
 * given network (elastos, heco, etc).
 */
export abstract class NetworkWallet {
    public id: string = null;
    protected transactionDiscoveryProvider: TransactionProvider<any> = null;

    public subWallets: {
        [k: string]: SubWallet<any>
    } = {};

    public nfts: NFT[] = [];

    public subWalletsListChange = new Subject<SubWallet<any>>(); // Subwallet added or created

    constructor(
        public masterWallet: MasterWallet,
        public network: Network
    ) {
        this.id = masterWallet.id;
    }

    public async initialize(): Promise<void> {
        await this.prepareStandardSubWallets();
        await this.populateWithExtendedInfo(await LocalStorage.instance.getExtendedNetworWalletInfo(this.id, GlobalNetworksService.instance.activeNetworkTemplate.value, this.network.key));
    }

    /**
     * Starts network wallet and subwallets updates in background.
     * All the initializations here are not mandatory during initializations and can deliver
     * asynchronous content at any time.
     */
    public startBackgroundUpdates(): Promise<void> {
        for (let subWallet of this.getSubWallets()) {
            void subWallet.startBackgroundUpdates();
        }

        this.getTransactionDiscoveryProvider().start();

        return;
    }

    /**
     * Stops network wallet and subwallets updates that are running in background.
     * This method call should be awaited to make sure every running task is stopped before
     * switching to another user or network for instance.
     */
    public async stopBackgroundUpdates(): Promise<void> {
        await this.getTransactionDiscoveryProvider().stop();
    }

    public getDisplayBalance(): BigNumber {
        // Sum all subwallets balances to get the master wallet total balance
        // Only standard ELA wallets are summed up as ERC20 wallets amounts use their own currency
        // and canno't be stacked on top of ELA as we don't have a exchange rate for now.
        let balance = new BigNumber(0);
        for (let subWallet of Object.values(this.subWallets)) {
            if (subWallet.isStandardSubWallet()) {
                if (!subWallet.balance.isNaN()) {
                    balance = balance.plus(subWallet.balance);
                }
            }
        }

        return balance.dividedBy(Config.SELAAsBigNumber);
    }

    public abstract getDisplayTokenName(): string;

    /**
     * Update balance and transaction list.
     */
    public async update() {
        for (let subWallet of Object.values(this.subWallets)) {
            await subWallet.update();
        }
    }

    public getSubWalletBalance(coinId: CoinID): BigNumber {
        Logger.log("wallet", "getSubWalletBalance", coinId, this.subWallets)
        return this.subWallets[coinId].balance;
    }

    public hasSubWallet(coinId: CoinID): boolean {
        return coinId in this.subWallets;
    }

    /**
     * Returns the list of all subwallets except the excluded one.
     */
    public subWalletsWithExcludedCoin(excludedCoinName: CoinID, type: CoinType = null): SubWallet<any>[] {
        // Hide the id chain, do not use the id chain any more.
        return Object.values(this.subWallets).filter((sw) => {
            return (sw.id !== excludedCoinName) && (sw.id !== StandardCoinName.IDChain) && (type !== null ? sw.type === type : true);
        });
    }

    /**
     * Each inheriting network wallet must create its standard subwallets to the SPVSDK if
     * not yet created, and push instances of those subwallets so we can store them.
     */
    protected abstract prepareStandardSubWallets(): Promise<void>;

    /**
     * Returns the main subwallet inside this network wallet, responsible for refreshing the list of
     * ERC20 tokens, NFTs, etc. For elastos, this is the ESC sidechain (no EID support for now).
     */
    public abstract getMainEvmSubWallet(): StandardEVMSubWallet<EthTransaction>;

    /**
     * Adds a new subwallet to this network wallet, based on a given coin type.
     */
    public async createNonStandardSubWallet(coin: Coin): Promise<void> {
        try {
            let newSubWallet = await SubWalletBuilder.newFromCoin(this, coin);
            this.subWallets[coin.getID()] = newSubWallet;

            Logger.log("wallet", "Created subwallet with id " + coin.getID() + " for wallet " + this.id);

            await this.save();

            this.subWalletsListChange.next(newSubWallet);
        }
        catch (err) {
            if (err.code !== 20001) {// 20001: Unsupported subwallet in some test network.
                throw err;
            }
        }
    }

    public async removeNonStandardSubWallet(coin: Coin): Promise<void> {
        Logger.log("wallet", "Removing subwallet with id " + coin.getID() + " from wallet " + this.id);

        let deletedSubWallet = this.subWallets[coin.getID()];
        delete this.subWallets[coin.getID()];

        await this.save();

        this.subWalletsListChange.next(deletedSubWallet);
    }

    /**
     * Convenient method to access subwallets as an array alphabetically.
     */
    public getSubWallets(): SubWallet<any>[] {
        return Object.values(this.subWallets).sort((a, b) => {
            if (a.type == CoinType.STANDARD && (b.type == CoinType.STANDARD)) return 0;
            if (a.type == CoinType.STANDARD) return -1;
            if (b.type == CoinType.STANDARD) return 1;
            return a.getFriendlyName() > b.getFriendlyName() ? 1 : -1
        }
        );
    }

    public getSubWallet(id: CoinID): SubWallet<any> {
        return this.subWallets[id];
    }

    /**
     * Returns the list of all subwallets by CoinType
     */
    public getSubWalletsByType(type: CoinType): SubWallet<any>[] {
        return Object.values(this.subWallets).filter((sw) => {
            return (sw.type === type);
        });
    }

    /**
     * Tells if this master wallet contains a NFT information, based on the NFT's contract address.
     */
    public containsNFT(contractAddress: string): boolean {
        return this.nfts.findIndex(nft => nft.contractAddress === contractAddress) !== -1;
    }

    public async createNFT(nftType: NFTType, contractAddress: string, balance: number): Promise<void> {
        let resolvedInfo = await this.masterWallet.erc721Service.getCoinInfo(contractAddress);
        if (resolvedInfo) {
            let nft = new NFT(nftType, contractAddress, balance);
            nft.setResolvedInfo(resolvedInfo);
            this.nfts.push(nft);

            await this.save();
        }
    }

    public getNFTs(): NFT[] {
        return this.nfts;
    }

    public getNFTByAddress(contractAddress: string): NFT {
        return this.nfts.find(n => n.contractAddress === contractAddress);
    }

    /**
     * Retrieves latest information about assets on chain and update the local cache and model.
     */
    public async refreshNFTAssets(nft: NFT): Promise<void> {
        let accountAddress = await this.getMainEvmSubWallet().createAddress();
        if (nft.type == NFTType.ERC721) {
            let assets = await this.masterWallet.erc721Service.fetchAllAssets(accountAddress, nft.contractAddress);
            console.log("ASSETS", assets);

            nft.assets = assets; // can be null (couldn't fetch assets) or empty (0 assets)
        }
    }

    /**
     * Save network wallet info to permanent storage
     */
    public async save() {
        const extendedInfo = this.getExtendedWalletInfo();
        Logger.log('wallet', "Saving network wallet extended info", this, extendedInfo);

        await LocalStorage.instance.setExtendedNetworkWalletInfo(this.id, GlobalNetworksService.instance.activeNetworkTemplate.value, this.network.key, extendedInfo);
    }

    public getExtendedWalletInfo(): ExtendedNetworkWalletInfo {
        let extendedInfo = new ExtendedNetworkWalletInfo();

        extendedInfo.subWallets = this.getSubWallets().map(subwallet => SerializedSubWallet.fromSubWallet(subwallet));

        for (let nft of this.nfts) {
            extendedInfo.nfts.push(nft.toSerializedNFT());
        }

        return extendedInfo;
    }

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    public populateWithExtendedInfo(extendedInfo: ExtendedNetworkWalletInfo) {
        Logger.log("wallet", "Populating network master wallet with extended info", this.id, extendedInfo);

        // In case of newly created wallet we don't have extended info from local storage yet,
        // which is normal.
        if (extendedInfo) {
            for (let serializedSubWallet of extendedInfo.subWallets) {
                // NOTE: for now, we save the standard subwallets but we don't restore them from extended info
                // as they are always rebuilt by default by the network wallet. Later this COULD be a problem
                // if we want to save some information about those standard subwallets, in extended infos.
                if (serializedSubWallet.type !== "STANDARD") {
                    let subWallet = SubWalletBuilder.newFromSerializedSubWallet(this, serializedSubWallet);
                    if (subWallet) {
                        this.subWallets[serializedSubWallet.id] = subWallet;
                    }
                }
            }

            this.nfts = [];
            if (extendedInfo.nfts) {
                for (let serializedNFT of extendedInfo.nfts) {
                    let nft: NFT = NFT.parse(serializedNFT);
                    if (nft) {
                        this.nfts.push(nft);
                    }
                }
            }
        }
    }

    public getTransactionDiscoveryProvider(): TransactionProvider<any> {
        return this.transactionDiscoveryProvider;
    }
}
