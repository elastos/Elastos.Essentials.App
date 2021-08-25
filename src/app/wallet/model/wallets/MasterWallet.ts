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
import { LocalStorage } from '../../services/storage.service';
import { NetworkWallet } from './networkwallet';
import { MainchainSubWallet } from './elastos/mainchain.subwallet';
import { runDelayed } from 'src/app/helpers/sleep.helper';

export type WalletID = string;

export type Theme = {
    background: string,
    color: string
};

export class ExtendedMasterWalletInfo {
    /** User defined wallet name */
    name: string;
    /* Wallet theme */
    theme: Theme;
}

export class MasterWallet {
    public id: string = null;
    public name: string = null;
    public theme: Theme = null;

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
        const extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfo(masterId);
        return !!extendedInfo; // not null or undefined
    }

    public async prepareAfterCreation(): Promise<void> {
        let extendedInfo = this.getExtendedWalletInfo();
        await this.populateWithExtendedInfo(extendedInfo);
    }

    /**
     * Save master wallet info to permanent storage
     */
    public async save() {
        const extendedInfo = this.getExtendedWalletInfo();
        Logger.log('wallet', "Saving master wallet extended info", this, extendedInfo);

        await this.localStorage.setExtendedMasterWalletInfo(this.id, extendedInfo);
    }

    public getExtendedWalletInfo(): ExtendedMasterWalletInfo {
        let extendedInfo = new ExtendedMasterWalletInfo();

        extendedInfo.name = this.name;
        extendedInfo.theme = this.theme;

        return extendedInfo;
    }

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    public async populateWithExtendedInfo(extendedInfo: ExtendedMasterWalletInfo): Promise<void> {
        Logger.log("wallet", "Populating master wallet with extended info", this.id, extendedInfo);

        // Retrieve wallet account type
        this.account = await this.walletManager.spvBridge.getMasterWalletBasicInfo(this.id);

        Logger.log("wallet", "Populated master wallet:", this);
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
