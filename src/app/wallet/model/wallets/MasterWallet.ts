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
import { Logger } from 'src/app/logger';
import { NFT, NFTType, SerializedNFT } from '../nft';
import { ERC721Service } from '../../services/erc721.service';
import { ERC20TokenInfo } from '../Transaction';

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
    /** List of serialized NFTs added earlier to this master wallet */
    nfts: SerializedNFT[] = []; // TODO: Save each NFT's list of tokens in another storage item.
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

    public nfts: NFT[] = [];

    public account: WalletAccount = {
        Type: WalletAccountType.STANDARD,
        SingleAddress: false
    };

    constructor(
        public walletManager: WalletManager,
        public coinService: CoinService,
        public erc721Service: ERC721Service,
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
    public async populateWithExtendedInfo(extendedInfo: ExtendedWalletInfo) {
        Logger.log("wallet", "Populating master wallet with extended info", this.id, extendedInfo);

        // Retrieve wallet account type
        this.account = await this.walletManager.spvBridge.getMasterWalletBasicInfo(this.id);

        // In case of newly created wallet we don't have extended info from local storagd yet,
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

        Logger.log("wallet", "Populated master wallet:", this);
    }

    public getDisplayBalance(): BigNumber {
        // Sum all subwallets balances to get the master wallet total balance
        // Only standard ELA wallets are summed up as ERC20 wallets amounts use their own currency
        // and canno't be stacked on top of ELA as we don't have a exchange rate for now.
        let balance = new BigNumber(0);
        for (let subWallet of Object.values(this.subWallets)) {
            if (subWallet instanceof StandardSubWallet) {
              if (!subWallet.balance.isNaN()) {
                balance = balance.plus(subWallet.balance);
              }
            }
        }

        return balance.dividedBy(Config.SELAAsBigNumber);
    }

    /**
     * Update balance and transaction list.
     */
    public async update() {
        for (let subWallet of Object.values(this.subWallets)) {
            await subWallet.update();
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
        // Hide the id chain, do not use the id chain any more.
        return Object.values(this.subWallets).filter((sw)=>{
            return (sw.id !== excludedCoinName) && (sw.id !== StandardCoinName.IDChain) && (type !== null ? sw.type === type : true);
        });
    }

    /**
     * Adds a new subwallet to this master wallet, based on a given coin type.
     */
    public async createSubWallet(coin: Coin) {
        try {
          this.subWallets[coin.getID()] = await SubWalletBuilder.newFromCoin(this, coin);

          Logger.log("wallet", "Created subwallet with id "+coin.getID()+" for wallet "+this.id);

          await this.walletManager.saveMasterWallet(this);
        }
        catch (err) {
          if (err.code !== 20001) {// 20001: Unsupported subwallet in some test network.
            throw err;
          }
        }
    }

    /**
     * Removes a subwallet (coin - ex: ela, idchain) from the given wallet.
     */
    public async destroySubWallet(coinId: CoinID) {
        let subWallet = this.subWallets[coinId];
        if (subWallet) {
          await subWallet.destroy();

          // Delete the subwallet from out local model.
          delete this.subWallets[coinId];

          await this.walletManager.saveMasterWallet(this);
        }
    }

    /**
     * Removes all subwallets from the given wallet.
     */
    public async destroyAllSubWallet() {
        for (let subWallet of Object.values(this.subWallets)) {
            await subWallet.destroy();
            delete this.subWallets[subWallet.id];
        }
    }

    /**
     * Convenient method to access subwallets as an array alphabetically.
     */
    public getSubWallets(): SubWallet[] {
        return Object.values(this.subWallets).sort((a, b) => {
          if (a.type == CoinType.STANDARD && (b.type == CoinType.STANDARD)) return 0;
          if (a.type == CoinType.STANDARD) return -1;
          if (b.type == CoinType.STANDARD) return 1;
          return a.getFriendlyName() > b.getFriendlyName() ? 1 : -1}
          );
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
     * Get all the tokens (ERC 20, 721, 1155), and create the subwallet.
     */
    public async updateERCTokenList(activeNetworkTemplate: string) {
        if (!this.subWallets[StandardCoinName.ETHSC]) {
            Logger.log("wallet", 'updateERC20TokenList no ETHSC');
            return;
        }

        const ercTokenList = await (this.subWallets[StandardCoinName.ETHSC] as ETHChainSubWallet).getERC20TokenList();
        if (ercTokenList == null) return;

        // For each ERC token discovered by the wallet SDK, we check its type and handle it.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ercTokenList.forEach(async (token: ERC20TokenInfo) => {
            if (token.type === "ERC-20") {
                if (token.symbol && token.name) {
                    if (!this.subWallets[token.symbol] && !this.coinService.isCoinDeleted(token.contractAddress)) {
                        try {
                            // Check if we already know this token globally. If so, we add it as a new subwallet
                            // to this master wallet. Otherwise we add the new token to the global list first then
                            // add a subwallet as well.
                            const erc20Coin = this.coinService.getERC20CoinByContracAddress(token.contractAddress);
                            if (erc20Coin) {
                                await this.createSubWallet(erc20Coin);
                            } else {
                                const newCoin = new ERC20Coin(token.symbol, token.symbol, token.name, token.contractAddress, activeNetworkTemplate, true);
                                await this.coinService.addCustomERC20Coin(newCoin, this.walletManager.getWalletsList());
                            }
                        } catch (e) {
                            Logger.log("wallet", 'updateERC20TokenList exception:', e);
                        }
                    }
                } else {
                    Logger.warn('wallet', 'Token has no name or symbol:', token);
                }
            }
            else if (token.type === "ERC-721") {
                if (!this.containsNFT(token.contractAddress)) {
                    await this.createNFT(NFTType.ERC721, token.contractAddress, Number.parseInt(token.balance));
                }
            }
            else if (token.type === "ERC-1155") {
                Logger.warn('wallet', 'ERC1155 NFTs not yet implemented', token);
            }
            else {
                Logger.warn('wallet', 'Unhandled token type:', token);
            }
        });
    }

    /**
     * Tells if this master wallet contains a NFT information, based on the NFT's contract address.
     */
    public containsNFT(contractAddress: string): boolean {
        return this.nfts.findIndex(nft => nft.contractAddress === contractAddress) !== -1;
    }

    public async createNFT(nftType: NFTType, contractAddress: string, balance: number): Promise<void> {
        let resolvedInfo = await this.erc721Service.getCoinInfo(contractAddress);
        if (resolvedInfo) {
          let nft = new NFT(nftType, contractAddress, balance);
          nft.setResolvedInfo(resolvedInfo);
          this.nfts.push(nft);

          await this.walletManager.saveMasterWallet(this);
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
        let accountAddress = await this.getSubWallet(StandardCoinName.ETHSC).createAddress();
        if (nft.type == NFTType.ERC721) {
            let assets = await this.erc721Service.fetchAllAssets(accountAddress, nft.contractAddress);
            console.log("ASSETS", assets);

            nft.assets = assets; // can be null (couldn't fetch assets) or empty (0 assets)
        }
    }
}

class SubWalletBuilder {
    /**
     * Newly created wallet, base on a coin type.
     */
    static newFromCoin(masterWallet: MasterWallet, coin: Coin): Promise<SubWallet> {
        Logger.log("wallet", "Creating new subwallet using coin", coin);

        switch (coin.getType()) {
            case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromCoin(masterWallet, coin);
            case CoinType.ERC20:
                return ERC20SubWallet.newFromCoin(masterWallet, coin);
            default:
                Logger.warn('wallet', "Unsupported coin type", coin.getType());
                break;
        }
    }

    /**
     * Restored wallet from local storage info.
     */
    static newFromSerializedSubWallet(masterWallet: MasterWallet, serializedSubWallet: SerializedSubWallet): SubWallet {
        if (!serializedSubWallet)
            return null; // Should never happen, but happened because of some other bugs.

        switch (serializedSubWallet.type) {
            case CoinType.STANDARD:
                return StandardSubWalletBuilder.newFromSerializedSubWallet(masterWallet, serializedSubWallet);
            case CoinType.ERC20:
                return ERC20SubWallet.newFromSerializedSubWallet(masterWallet, serializedSubWallet);
            default:
                Logger.warn('wallet', "Unsupported subwallet type", serializedSubWallet.type);
                break;
        }
    }
}