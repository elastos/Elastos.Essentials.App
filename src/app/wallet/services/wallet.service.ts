/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { SPVWalletPluginBridge } from '../model/SPVWalletPluginBridge';
import { MasterWallet, WalletID } from '../model/wallets/MasterWallet';
import { CoinID, StandardCoinName } from '../model/Coin';
import { WalletAccountType, WalletAccount } from '../model/WalletAccount';
import { SerializedSubWallet } from '../model/wallets/SubWallet';
import { InvalidVoteCandidatesHelper, InvalidCandidateForVote } from '../model/InvalidVoteCandidatesHelper';
import { CoinService } from './coin.service';
import { JsonRPCService } from './jsonrpc.service';
import { PopupProvider } from './popup.service';
import { Native } from './native.service';
import { LocalStorage } from './storage.service';
import { AuthService } from './auth.service';
import { Transfer } from './cointransfer.service';
import { IDChainSubWallet } from '../model/wallets/IDChainSubWallet';
import { MainchainSubWallet } from '../model/wallets/MainchainSubWallet';
import { ETHChainSubWallet } from '../model/wallets/ETHChainSubWallet';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { NetworkType } from 'src/app/model/networktype';
import { Events } from 'src/app/services/events.service';
import { StandardSubWalletBuilder } from '../model/wallets/StandardSubWalletBuilder';
import { ERC721Service } from './erc721.service';
import { BehaviorSubject } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class WalletManager {
    public static instance: WalletManager = null;

    public masterWallets: {
        [index: string]: MasterWallet
    } = {};

    public hasPromptTransfer2IDChain = true;

    public needToCheckUTXOCountForConsolidation = true;
    public needToPromptTransferToIDChain = false; // Whether it's time to ask user to transfer some funds to the ID chain for better user experience or not.

    public spvBridge: SPVWalletPluginBridge = null;

    public walletServiceStatus = new BehaviorSubject<boolean>(false); // Whether the initial initialization is completed or not

    constructor(
        public events: Events,
        public native: Native,
        public zone: NgZone,
        public modalCtrl: ModalController,
        public translate: TranslateService,
        public localStorage: LocalStorage,
        private coinService: CoinService,
        private erc721Service: ERC721Service,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        private http: HttpClient,
        public jsonRPCService: JsonRPCService,
        private prefs: GlobalPreferencesService,
        private didSessions: GlobalDIDSessionsService,
    ) {
        WalletManager.instance = this;
    }

    async init() {
        Logger.log('wallet', "Master manager is initializing");
        // TODO: reset masterWallets, because this servcie is not destroyed when signout.
        this.masterWallets = {};

        this.jsonRPCService.init();

        this.spvBridge = new SPVWalletPluginBridge(this.native, this.events, this.popupProvider);

        const hasWallet = await this.initWallets();

        if (!hasWallet) {
            this.walletServiceStatus.next(true);
            this.events.publish("walletmanager:initialized");
            return;
        }

        this.localStorage.get('hasPrompt').then((val) => {
            this.hasPromptTransfer2IDChain = val ? val : false;
        });

        Logger.log('wallet', "Wallet manager initialization complete");

        this.events.publish("walletmanager:initialized");
        this.walletServiceStatus.next(true);
    }

    async stop() {
      await this.spvBridge.destroy();
    }

    private async initWallets(): Promise<boolean> {
        try {
            // NetWork Type
            let networkType: NetworkType = await this.prefs.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);
            let networkConfig = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'chain.network.config');
            if (networkType === NetworkType.LrwNet) { // For crcouncil voting test
              networkType = NetworkType.PrvNet;
              networkConfig = "{\"ELA\":{\"ChainParameters\":{\"MagicNumber\":20200501,\"StandardPort\":40008,\"DNSSeeds\":[\"longrunweather.com\"],\"CheckPoints\":[[0,\"d8d33c8a0a632ecc418bd7f09cd315dfc46a7e3e98e48c50c70a253e6062c257\",1513936800,486801407]]}},\"IDChain\":{\"ChainParameters\":{\"MagicNumber\":20200503,\"StandardPort\":41008,\"DNSSeeds\":[\"longrunweather.com\"],\"CheckPoints\":[[0,\"56be936978c261b2e649d58dbfaf3f23d4a868274f5522cd2adb4308a955c4a3\",1530360000,486801407]]}}}"

            }
            await this.spvBridge.setNetwork(networkType, networkConfig);
            // await this.spvBridge.setLogLevel(WalletPlugin.LogType.DEBUG);

            let signedInEntry = await this.didSessions.getSignedInIdentity();
            let rootPath = signedInEntry.didStoragePath;
            Logger.warn('wallet', "rootPath:", rootPath);
            await this.spvBridge.init(rootPath);

            Logger.log('wallet', "Getting all master wallets from the SPV SDK");
            const idList = await this.spvBridge.getAllMasterWallets();

            if (idList.length === 0) {
                Logger.log('wallet', "No SPV wallet found, going to launcher screen");
                //this.goToLauncherScreen();
                return false;
            }

            Logger.log('wallet', "Got "+idList.length+" wallets from the SPVSDK");

            // Rebuild our local model for all wallets returned by the SPV SDK.
            for (let i = 0; i < idList.length; i++) {
                const masterId = idList[i];

                Logger.log('wallet', "Rebuilding local model for wallet id "+masterId);

                // Try to retrieve locally storage extended info about this wallet
                const extendedInfo = await this.localStorage.getExtendedMasterWalletInfos(masterId);
                if (!extendedInfo) {
                    // No backward compatibility support: old wallets are just destroyed.
                    await this.spvBridge.destroyWallet(masterId);
                    continue;
                } else {
                    Logger.log('wallet', "Found extended wallet info for master wallet id " + masterId, extendedInfo);

                    // Create a model instance for each master wallet returned by the SPV SDK.
                    this.masterWallets[masterId] = new MasterWallet(this, this.coinService, this.erc721Service, masterId);

                    // reopen ELA, IDChain and ETHSC automatically
                    // Don't need to createSubwallet, MasterWallets::populateWithExtendedInfo will create Subwallet with name.
                    let subwallet: SerializedSubWallet;
                    subwallet = extendedInfo.subWallets.find(wallet => wallet.id === StandardCoinName.ELA);
                    if (!subwallet) {
                        Logger.log('wallet', '(Re)Opening ELA');
                        const subWallet = new MainchainSubWallet(this.masterWallets[masterId]);
                        extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    }
                    subwallet = extendedInfo.subWallets.find(wallet => wallet.id === StandardCoinName.IDChain);
                    if (!subwallet) {
                        Logger.log('wallet', '(Re)Opening IDChain');
                        const subWallet = new IDChainSubWallet(this.masterWallets[masterId]);
                        extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    }
                    subwallet = extendedInfo.subWallets.find(wallet => wallet.id === StandardCoinName.ETHSC);
                    if (!subwallet) {
                        Logger.log('wallet', '(Re)Opening ETHSC');
                        const subWallet = new ETHChainSubWallet(this.masterWallets[masterId], StandardCoinName.ETHSC);
                        extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    }

                    subwallet = extendedInfo.subWallets.find(wallet => wallet.id === StandardCoinName.ETHDID);
                    if (!subwallet) {
                        Logger.log('wallet', '(Re)Opening ETHDID');
                        // const subWallet = new ETHChainSubWallet(this.masterWallets[masterId], StandardCoinName.ETHDID);
                        // await this.masterWallets[masterId].walletManager.spvBridge.createSubWallet(masterId, StandardCoinName.ETHDID);
                        const subWallet = await StandardSubWalletBuilder.newFromCoin(this.masterWallets[masterId], this.coinService.getCoinByID(StandardCoinName.ETHDID));
                        extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    }

                    // subwallet = extendedInfo.subWallets.find(wallet => wallet.id === StandardCoinName.ETHHECO);
                    // if (!subwallet) {
                    //     Logger.log('wallet', '(Re)Opening ETHHECO');
                    //     // const subWallet = new ETHChainSubWallet(this.masterWallets[masterId], StandardCoinName.ETHHECO);
                    //     const subWallet = await StandardSubWalletBuilder.newFromCoin(this.masterWallets[masterId], this.coinService.getCoinByID(StandardCoinName.ETHHECO));
                    //     extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    // }
                }

                await this.masterWallets[masterId].populateWithExtendedInfo(extendedInfo);
                /* await  */this.masterWallets[masterId].updateERCTokenList(this.prefs);
            }
        } catch (error) {
            Logger.error('wallet', 'initWallets error:', error);
            return false;
        }
        return true;
    }

    // For background service
    public async updateMasterWallets(masterId: string, action: string) {
        if (action === 'remove') {
            // Delete wallet
            delete this.masterWallets[masterId];
        } else {
            // Try to retrieve locally storage extended info about this wallet
            const extendedInfo = await this.localStorage.getExtendedMasterWalletInfos(masterId);
            if (extendedInfo) {
                // Create a model instance for each master wallet returned by the SPV SDK.
                this.masterWallets[masterId] = new MasterWallet(this, this.coinService, this.erc721Service, masterId);
                await this.masterWallets[masterId].populateWithExtendedInfo(extendedInfo);
            }
        }
    }

    // TODO: delete it, we do not use active wallet
    public setRecentWalletId(id) {
        this.localStorage.saveCurMasterId({ masterId: id });
    }

    public getMasterWallet(masterId: WalletID): MasterWallet {
        return this.masterWallets[masterId];
    }

    public findMasterWalletBySubWalletID(subwalletId: CoinID): MasterWallet {
        for (let w of Object.values(this.masterWallets) ){
            let subWallet = w.getSubWallet(subwalletId);
            if (subWallet)
                return w;
        }
        return null;
    }

    public getWalletsList(): MasterWallet[] {
        return Object.values(this.masterWallets);
    }

    public getWalletsCount(): number {
        return Object.values(this.masterWallets).length;
    }

    public walletNameExists(name: string): boolean {
        const existingWallet = Object.values(this.masterWallets).find((wallet) => {
            return wallet.name === name;
        });
        return existingWallet != null;
    }

    private goToLauncherScreen() {
        this.native.setRootRouter('/wallet/launcher');
    }

    public async getCurrentMasterIdFromStorage(): Promise<string> {
        const data = await this.localStorage.getCurMasterId();
        if (data && data["masterId"]) {
            return data["masterId"];
        } else {
            return null;
        }
    }

    /**
     * Creates a new master wallet both in the SPV SDK and in our local model.
     */
    public async createNewMasterWallet(
        masterId: WalletID,
        walletName: string,
        mnemonicStr: string,
        mnemonicPassword: string,
        payPassword: string,
        singleAddress: boolean
    ) {
        Logger.log('wallet', "Creating new master wallet");

        await this.spvBridge.createMasterWallet(
            masterId,
            mnemonicStr,
            mnemonicPassword,
            payPassword,
            singleAddress
        );

        const account: WalletAccount = {
            SingleAddress: singleAddress,
            Type: WalletAccountType.STANDARD
        };

        await this.addMasterWalletToLocalModel(masterId, walletName, account);

        // Go to wallet's home page.
        this.native.setRootRouter("/wallet/wallet-home");
    }

    /**
     * After creates a new master wallet both in the SPV SDK and in our local model, using a given mnemonic.
     * Go to wallet home page
     */
     public async importMasterWalletWithMnemonic(
        masterId: WalletID,
        walletName: string,
        mnemonicStr: string,
        mnemonicPassword: string,
        payPassword: string,
        singleAddress: boolean
    ) {
        await this.importWalletWithMnemonic(masterId, walletName, mnemonicStr, mnemonicPassword, payPassword, singleAddress);

        // Go to wallet's home page.
        this.native.setRootRouter("/wallet/wallet-home");
    }

    /**
     * Creates a new master wallet both in the SPV SDK and in our local model, using a given mnemonic.
     */
    public async importWalletWithMnemonic(
        masterId: WalletID,
        walletName: string,
        mnemonicStr: string,
        mnemonicPassword: string,
        payPassword: string,
        singleAddress: boolean
    ) {
        Logger.log('wallet', "Importing new master wallet with mnemonic");
        await this.spvBridge.importWalletWithMnemonic(masterId, mnemonicStr, mnemonicPassword, payPassword, singleAddress);

        const account: WalletAccount = {
            SingleAddress: singleAddress,
            Type: WalletAccountType.STANDARD
        };

        await this.addMasterWalletToLocalModel(masterId, walletName, account);
    }

    private async addMasterWalletToLocalModel(id: WalletID, name: string, walletAccount: WalletAccount) {
        Logger.log('wallet', "Adding master wallet to local model", id, name);

        // Add a new wallet to our local model
        this.masterWallets[id] = new MasterWallet(this, this.coinService, this.erc721Service, id, name);

        // Set some wallet account info
        this.masterWallets[id].account = walletAccount;

        // Get some basic information ready in our model.
        await this.masterWallets[id].populateWithExtendedInfo(null);

        // A master wallet must always have at least the ELA subwallet
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ELA));

        // Even if not mandatory to have, we open the main sub wallets for convenience as well.
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.IDChain));
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ETHSC));
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ETHDID));
        // await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ETHHECO));

        // Get all tokens and create subwallet
        await this.masterWallets[id].updateERCTokenList(this.prefs);

        // Save state to local storage
        await this.saveMasterWallet(this.masterWallets[id]);

        this.setRecentWalletId(id);
    }

    /**
     * Destroy a master wallet, active or not, base on its id
     */
    async destroyMasterWallet(id: string) {
        // Destroy the wallet in the wallet plugin
        await this.spvBridge.destroyWallet(id);

        // Remove password
        await this.authService.deleteWalletPassword(id);

        // Save this modification to our permanent local storage
        await this.localStorage.setExtendedMasterWalletInfo(this.masterWallets[id].id, null);

        // Destroy from our local model
        delete this.masterWallets[id];

        // Notify some listeners
        this.events.publish("masterwallet:destroyed", id);

        if (Object.values(this.masterWallets).length > 0) {

            this.native.setRootRouter("/wallet/wallet-home");
        } else {
            this.goToLauncherScreen();
        }
    }
    /**
     * Save master wallets list to permanent local storage.
     */
    public async saveMasterWallet(masterWallet: MasterWallet) {
        const extendedInfo = masterWallet.getExtendedWalletInfo();
        Logger.log('wallet', "Saving wallet extended info", masterWallet, extendedInfo);

        await this.localStorage.setExtendedMasterWalletInfo(masterWallet.id, extendedInfo);
    }

    public setHasPromptTransfer2IDChain() {
        this.hasPromptTransfer2IDChain = true;
        this.needToPromptTransferToIDChain = false;
        this.localStorage.set('hasPrompt', true); // TODO: rename to something better than "hasPrompt"
    }

    // TODO: make a more generic flow to not do this only for the ID chain but also for the ETH chain.
    public checkIDChainBalance(masterId: WalletID) {
        if (this.hasPromptTransfer2IDChain) { return; }
        if (this.needToPromptTransferToIDChain) { return; }

        // // IDChain not open, do not prompt
        // if (Util.isNull(this.masterWallet[this.curMasterId].subWallets[Config.IDCHAIN])) {
        //     return;
        // }

        const masterWallet = this.getMasterWallet(masterId);
        if (masterWallet.subWallets[StandardCoinName.ELA].balance.lte(1000000)) {
            Logger.log('wallet', 'ELA balance ', masterWallet.subWallets[StandardCoinName.ELA].balance);
            return;
        }

        if (masterWallet.subWallets[StandardCoinName.IDChain].balance.gt(100000)) {
            Logger.log('wallet', 'IDChain balance ',  masterWallet.subWallets[StandardCoinName.IDChain].balance);
            return;
        }

        this.needToPromptTransferToIDChain = true;
    }

    /**
     * Retrieves the wallet store password from the password manager.
     * This method is here since the beginning and seems useless. Could probably be replaced by
     * authService's getWalletPassword() directly.
     */
    public async openPayModal(transfer: Transfer): Promise<string> {
        const payPassword = await this.authService.getWalletPassword(transfer.masterWalletId, true, true);
        if (payPassword === null) {
            return null;
        }
        transfer.payPassword = payPassword;

        return payPassword;
    }
}
