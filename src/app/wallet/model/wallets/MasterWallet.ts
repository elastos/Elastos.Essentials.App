import { SubWallet, SerializedSubWallet  } from './subwallet';
import { WalletAccount, WalletAccountType } from '../walletaccount';
import { WalletService } from '../../services/wallet.service';
import { StandardSubWallet } from './standard.subwallet';
import { ERC20SubWallet } from './erc20.subwallet';
import { Coin, CoinID, CoinType, ERC20Coin, StandardCoinName } from '../coin';
import { CoinService } from '../../services/coin.service';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import { StandardSubWalletBuilder } from './standardsubwalletbuilder';
import { ElastosEVMSubWallet } from './elastos/elastos.evm.subwallet';
import { Logger } from 'src/app/logger';
import { NFT, NFTType, SerializedNFT } from '../nfts/nft';
import { ERC721Service } from '../../services/erc721.service';
import { INetwork } from '../networks/inetwork';
import { LocalStorage } from '../../services/storage.service';
import { NetworkWallet } from './NetworkWallet';
import { MainchainSubWallet } from './elastos/mainchain.subwallet';
import { runDelayed } from 'src/app/helpers/sleep.helper';

export type WalletID = string;

export type Theme = {
    background: string,
    color: string
};

export class ExtendedWalletInfo {
    /** User defined wallet name */
    name: string;
    /** List of serialized subwallets added earlier to this master wallet */
    // TODO - NOT FOR MASTER WALLET subWallets: SerializedSubWallet[] = [];
    /** List of serialized NFTs added earlier to this master wallet */
    // TODO - NOT FOR MASTER WALLET nfts: SerializedNFT[] = []; // TODO: Save each NFT's list of tokens in another storage item.
    /* Wallet theme */
    theme: Theme;
}

export class MasterWallet {
    public id: string = null;
    public name: string = null;
    public theme: Theme = null;

    /**
     * The master wallet contains only standard sub wallets shared by all network
     */
    public standardSubWalletIDs: {
        [k: string]: SubWallet
    } = {};

    public account: WalletAccount = {
        Type: WalletAccountType.STANDARD,
        SingleAddress: false
    };

    constructor(
        public walletManager: WalletService,
        public coinService: CoinService,
        public erc721Service: ERC721Service,
        private localStorage: LocalStorage,
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

    public static async extendedInfoExistsForMasterId(masterId: string): Promise<boolean> {
        const extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfos(masterId);
        return !!extendedInfo; // not null or undefined
    }

    public async prepareAfterCreation(): Promise<void> {
        let extendedInfo = this.getExtendedWalletInfo();
        await this.populateWithExtendedInfo(extendedInfo);

        runDelayed(() => this.updateERCTokenList(), 5000);
    }

    /**
     * Save master wallet info to permanent storage
     */
     public async save() {
        const extendedInfo = this.getExtendedWalletInfo();
        Logger.log('wallet', "Saving wallet extended info", this, extendedInfo);

        await this.localStorage.setExtendedMasterWalletInfo(this.id, extendedInfo);
    }


    public getExtendedWalletInfo(): ExtendedWalletInfo {
        let extendedInfo = new ExtendedWalletInfo();

        extendedInfo.name = this.name;
        extendedInfo.theme = this.theme;

        /* TODO for (let subWallet of Object.values(this.subWallets)) {
            extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
        }

        for (let nft of this.nfts) {
            extendedInfo.nfts.push(nft.toSerializedNFT());
        } */

        return extendedInfo;
    }

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    public populateWithExtendedInfo(extendedInfo: ExtendedWalletInfo) {
        Logger.log("wallet", "Populating master wallet with extended info", this.id, extendedInfo);

        // Retrieve wallet account type
        /* TODO NETWORKS this.account = await this.walletManager.spvBridge.getMasterWalletBasicInfo(this.id);

        // In case of newly created wallet we don't have extended info from local storage yet,
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
        } */

        Logger.log("wallet", "Populated master wallet:", this);
    }

    /**
     * Update balance and transaction list.
     */
    public async update() {
        /* TODO for (let subWallet of Object.values(this.subWallets)) {
            await subWallet.update();
        } */
    }

    /**
     * Get all the tokens (ERC 20, 721, 1155), and create the subwallet.
     */
    public async updateERCTokenList() {
        /* TODO if (!this.subWallets[StandardCoinName.ETHSC]) {
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
        }); */
    }


    /**
     * Removes a subwallet (coin - ex: ela, idchain) from the given wallet.
     */
     /* public async destroyStandardSubWallet(coinId: CoinID) {
        let subWallet = this.standardSubWallets[coinId];
        if (subWallet) {
          await subWallet.destroy();

          // Delete the subwallet from out local model.
          delete this.standardSubWallets[coinId];

          await this.masterWallet.save();
        }
    } */

    /**
     * Removes all subwallets from the given wallet.
     */
    /* public async destroyAllStandardSubWallets() {
        for (let subWallet of Object.values(this.standardSubWallets)) {
            await subWallet.destroy();
            delete this.standardSubWallets[subWallet.id];
        }
    } */
}
