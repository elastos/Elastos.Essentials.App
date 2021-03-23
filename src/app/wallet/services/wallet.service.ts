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

import { SPVWalletPluginBridge, SPVWalletMessage, TxPublishedResult, ETHSCEventType, ETHSCEvent, ETHSCEventAction } from '../model/SPVWalletPluginBridge';
import { MasterWallet, WalletID } from '../model/wallets/MasterWallet';
import { StandardCoinName, CoinType } from '../model/Coin';
import { WalletAccountType, WalletAccount } from '../model/WalletAccount';
import { SubWallet, SerializedSubWallet } from '../model/wallets/SubWallet';
import { InvalidVoteCandidatesHelper, InvalidCandidateForVote } from '../model/InvalidVoteCandidatesHelper';
import { CoinService } from './coin.service';
import { JsonRPCService } from './jsonrpc.service';
import { PopupProvider } from './popup.service';
import { Native } from './native.service';
import { InAppRPCMessage, RPCMethod, RPCStartWalletSyncParams, RPCStopWalletSyncParams, RPCStopWalletSyncResponseParams, SPVSyncService } from './spvsync.service';
import { LocalStorage } from './storage.service';
import { AuthService } from './auth.service';
import { Transfer } from './cointransfer.service';
import { IDChainSubWallet } from '../model/wallets/IDChainSubWallet';
import { MainchainSubWallet } from '../model/wallets/MainchainSubWallet';
import { BackupRestoreService } from './backuprestore.service';
import { StandardSubWallet } from '../model/wallets/StandardSubWallet';
import { MainAndIDChainSubWallet } from '../model/wallets/MainAndIDChainSubWallet';
import { ETHChainSubWallet } from '../model/wallets/ETHChainSubWallet';
import { Events } from './events.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { NetworkType } from 'src/app/model/networktype';


class TransactionMapEntry {
    Code: number = null;
    Reason: string = null;
    WalletID: string = null;
    ChainID: string = null;
    Status: string = null;
    lock: boolean = false;
}

type TransactionMap = {
    [k: string]: TransactionMapEntry;
};

// TODO: Replace all the Promise<any> with real data structures
// TODO: Use real types everywhere, no "any" any more.

/***
 * wallet jni 交互
 *
 * WalletManager.ts -> Wallet.js -> wallet.java -> WalletManager.java
 */
@Injectable({
    providedIn: 'root'
})
export class WalletManager {
    public static instance: WalletManager = null;

    public masterWallets: {
        [index: string]: MasterWallet
    } = {};

    // TODO: what is this map for? Can we rename it ?
    public transactionMap: TransactionMap = {}; // when sync over, need to cleanup transactionMap

    public hasPromptTransfer2IDChain = true;

    public needToCheckUTXOCountForConsolidation = true;
    public needToPromptTransferToIDChain = false; // Whether it's time to ask user to transfer some funds to the ID chain for better user experience or not.

    public spvBridge: SPVWalletPluginBridge = null;

    constructor(
        public events: Events,
        public native: Native,
        public zone: NgZone,
        public modalCtrl: ModalController,
        public translate: TranslateService,
        public localStorage: LocalStorage,
        private coinService: CoinService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        private http: HttpClient,
        public jsonRPCService: JsonRPCService,
        private prefs: GlobalPreferencesService,
        private backupService: BackupRestoreService,
        private spvService:SPVSyncService
    ) {
        WalletManager.instance = this;
    }

    async init() {
        Logger.log('wallet', "Master manager is initializing");
        // TODO: reset masterWallets, because this servcie is not destroyed when signout.
        this.masterWallets = {};

        this.spvBridge = new SPVWalletPluginBridge(this.native, this.events, this.popupProvider);

        const hasWallet = await this.initWallets();

        this.jsonRPCService.init();

        // Start the sync service
        await this.spvService.init(this);

        if (!hasWallet) {
            //this.goToLauncherScreen();
            this.events.publish("walletmanager:initialized");
            return;
        }

        this.registerSubWalletListener();

        await this.startSyncAllWallet();

        this.localStorage.get('hasPrompt').then((val) => {
            this.hasPromptTransfer2IDChain = val ? val : false;
        });

        const publishTxList = await this.localStorage.getPublishTxList();
        if (publishTxList) {
            this.transactionMap = publishTxList;
        }

        // TODO: spvsdk can't get progress by api
        // Get last block time, progress from walletservice
        let syncProgress = this.spvService.getWalletSyncProgress();
        // tslint:disable-next-line:forin
        for (const masterId in syncProgress) {
            // tslint:disable-next-line:forin
            for (const chainIdKey in syncProgress[masterId]) {
                const chainId = chainIdKey as StandardCoinName;
                const progress = syncProgress[masterId][chainId].progress || 0;
                const lastBlockTime = syncProgress[masterId][chainId].lastBlockTime || 0;
                this.updateSyncProgress(masterId, chainId, progress, lastBlockTime);
            }
        }
        this.getAllMasterWalletBalanceByRPC();

        Logger.log('wallet', "Wallet manager initialization complete");

        this.events.publish("walletmanager:initialized");

        // The base init is completed. Now let's start the backup service in background (not a blocking await)
        this.initBackupService();
    }

    private async initWallets(): Promise<boolean> {
        try {
            // NetWork Type
            let networkType: NetworkType = await this.prefs.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);
            let networkConfig = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'chain.network.config');
            let jsonrpcUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.rpcapi');
            let apimiscUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.apimisc');
            await this.spvBridge.setNetwork(networkType, networkConfig, jsonrpcUrl, apimiscUrl );
            await this.spvBridge.init(GlobalDIDSessionsService.signedInDIDString);

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
                    this.masterWallets[masterId] = new MasterWallet(this, this.coinService, masterId);

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
                        const subWallet = new ETHChainSubWallet(this.masterWallets[masterId]);
                        extendedInfo.subWallets.push(subWallet.toSerializedSubWallet());
                    }
                }

                await this.masterWallets[masterId].populateWithExtendedInfo(extendedInfo);
                await this.masterWallets[masterId].updateERC20TokenList(this.prefs);
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
                this.masterWallets[masterId] = new MasterWallet(this, this.coinService, masterId);
                await this.masterWallets[masterId].populateWithExtendedInfo(extendedInfo);
            }
        }
    }

    private sendUpdateWalletInfo2Service(masterId: string, action: string) {
        this.spvService.updateMasterWallets(masterId, action);
    }

    // Backup service runs only in the UI because it requires user interaction sometimes, and we don't
    // wan't data model overlaps/conflicts with the background service or with intents.
    private async initBackupService() {
        // Give some fresh air to the wallet while starting, to show the UI first without overloading the CPU.
        // There is no hurry to start the backup service.
        setTimeout(async () => {
            await this.backupService.init();

            for (const wallet of this.getWalletsList()) {
                await this.backupService.setupBackupForWallet(wallet);
            }

            await this.backupService.checkSync(Object.values(this.masterWallets));
            //await this.backupService.testInstantELAStateDownload(Object.values(this.masterWallets));
        }, 5000);
    }

    // TODO: delete it, we do not use active wallet
    public setRecentWalletId(id) {
        this.localStorage.saveCurMasterId({ masterId: id });
    }

    public getMasterWallet(masterId: WalletID): MasterWallet {
        return this.masterWallets[masterId];
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
        this.native.setRootRouter('/launcher');
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
    }

    /**
     * Creates a new master wallet both in the SPV SDK and in our local model, using a given mnemonic.
     */
    public async importMasterWalletWithMnemonic(
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
        this.masterWallets[id] = new MasterWallet(this, this.coinService, id, name);

        // Set some wallet account info
        this.masterWallets[id].account = walletAccount;

        // Get some basic information ready in our model.
        await this.masterWallets[id].populateWithExtendedInfo(null);

        // A master wallet must always have at least the ELA subwallet
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ELA));

        // Even if not mandatory to have, we open the main sub wallets for convenience as well.
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.IDChain));
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ETHSC));

        // Get all tokens and create subwallet
        await this.masterWallets[id].updateERC20TokenList(this.prefs);

        this.registerSubWalletListener();

        // Save state to local storage
        await this.saveMasterWallet(this.masterWallets[id]);

        // To service
        this.sendUpdateWalletInfo2Service(id, 'add');

        this.setRecentWalletId(id);

        // Add this new wallet to the backup service
        await this.backupService.setupBackupForWallet(this.getMasterWallet(id));

        // Sync with remote
        await this.backupService.checkSync(this.getWalletsList());

        this.startWalletSync(id);

        // Go to wallet's home page.
        this.native.setRootRouter("/wallet-home");

        // Get balance by rpc
        this.getAllSubwalletsBalanceByRPC(id);
    }

    /**
     * Destroy a master wallet, active or not, base on its id
     */
    async destroyMasterWallet(id: string) {
        // Stop dealing with this wallet in the backup service
        await this.backupService.removeBackupTrackingForWallet(id);

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

        this.sendUpdateWalletInfo2Service(id, 'remove');

        if (Object.values(this.masterWallets).length > 0) {

            this.native.setRootRouter("/wallet-home");
        } else {
            this.goToLauncherScreen();
        }
    }

    /**
     * Save master wallets list to permanent local storage.
     */
    public async saveMasterWallet(masterWallet: MasterWallet) {
        const extendedInfo = masterWallet.getExtendedWalletInfo();
        Logger.log('wallet', "Saving wallet extended info", masterWallet.id, extendedInfo);

        await this.localStorage.setExtendedMasterWalletInfo(masterWallet.id, extendedInfo);
    }

    public async startSyncAllWallet() {
        for (const masterWallet of Object.values(this.masterWallets)) {
            this.startWalletSync(masterWallet.id);
        }
    }

    /**
     * Inform the background service (via RPC) that we want to start syncing a wallet.
     * If there is another wallet syncing, its on going sync will be stopped first.
     */
    public async startWalletSync(masterId: WalletID): Promise<void> {
        Logger.log('wallet', "Requesting sync service to start syncing wallet " + masterId);

        if (!this.getMasterWallet(masterId)) {
            // The master wallet is destroyed.
            Logger.log('wallet', 'startWalletSync error, the master wallet does not exist!');
            return;
        }

        // Add only standard subwallets to SPV sync request
        const chainIds: StandardCoinName[] = [];
        for (const subWallet of Object.values(this.getMasterWallet(masterId).subWallets)) {
            if (subWallet.type === CoinType.STANDARD) {
                chainIds.push(subWallet.id as StandardCoinName);
            }
        }

        await this.startSubWalletsSync(masterId, chainIds);
    }

    // TODO: When wallet is destroyed
    public async stopWalletSync(masterId: WalletID): Promise<boolean> {
        Logger.log('wallet', "Requesting sync service to stop syncing wallet " + masterId);

        // Add only standard subwallets to SPV stop sync request
        const chainIds: StandardCoinName[] = [];
        for (const subWallet of Object.values(this.getMasterWallet(masterId).subWallets)) {
            if (subWallet.type === CoinType.STANDARD) {
                chainIds.push(subWallet.id as StandardCoinName);
            }
        }

        return await this.stopSubWalletsSync(masterId, chainIds);
    }

    private startSubWalletsSync(masterId: WalletID, subWalletIds: StandardCoinName[]): Promise<void> {
        return this.spvService.syncStartSubWallets(masterId, subWalletIds);
    }

    private async stopSubWalletsSync(masterId: WalletID, subWalletIds: StandardCoinName[]): Promise<boolean> {
        return this.spvService.syncStopSubWallets(masterId, subWalletIds);
    }

    public async startSubWalletSync(masterId: WalletID, subWalletId: StandardCoinName): Promise<void> {
        await this.startSubWalletsSync(masterId, [subWalletId]);
    }

    public async stopSubWalletSync(masterId: WalletID, subWalletId: StandardCoinName): Promise<void> {
        await this.stopSubWalletsSync(masterId, [subWalletId]);
    }

    /**
     * Start listening to all events from the SPV SDK.
     */
    public registerSubWalletListener() {
        Logger.log('wallet', "Register wallet listener");

        this.spvBridge.registerWalletListener((event: SPVWalletMessage) => {
            this.zone.run(() => {
                this.handleSubWalletEvent(event);
            });
        });
    }

    /**
     * Handler for all SPV wallet events.
     */
    public handleSubWalletEvent(event: SPVWalletMessage) {
        const masterId = event.MasterWalletID;
        const chainId = event.ChainID;

        Logger.log('wallet', "SubWallet message: ", masterId, chainId, event);
        //Logger.log('wallet', event.Action, event.result);

        switch (event.Action) {
            case "OnTransactionStatusChanged":
                if (this.transactionMap[event.txId]) {
                    this.transactionMap[event.txId].Status = event.status;
                }
                break;
            case "OnBlockSyncProgress":
                this.updateSyncProgressFromCallback(masterId, chainId, event);
                break;
            case "OnBalanceChanged":
                this.getMasterWallet(masterId).getSubWallet(chainId).updateBalance();
                break;
            case "OnTxPublished":
                this.handleTransactionPublishedEvent(event);
                break;

            case "OnBlockSyncStopped":
            case "OnAssetRegistered":
            case "OnBlockSyncStarted":
            case "OnConnectStatusChanged":
                // Nothing
                break;
            case "OnETHSCEventHandled":
                this.updateETHSCEventFromCallback(masterId, chainId, event);
                break;
        }
    }

    /**
     * Updates the progress value of current wallet synchronization. This progress change
     * is saved into the model and triggers events so that the UI can update itself.
     */
    private updateSyncProgressFromCallback(masterId: WalletID, chainId: StandardCoinName, result: SPVWalletMessage) {
        this.updateSyncProgress(masterId, chainId, result.Progress, result.LastBlockTime);
    }

    private async updateSyncProgress(masterId: WalletID, chainId: StandardCoinName, progress: number, lastBlockTime: number) {
        const masterWallet = this.getMasterWallet(masterId);
        if (!masterWallet) {
            Logger.warn('wallet', "updateSyncProgress() called but wallet with ID", masterId, "does not exist!");
            return;
        }

        masterWallet.updateSyncProgress(chainId, progress, lastBlockTime);

        const subWallet = masterWallet.getSubWallet(chainId) as StandardSubWallet;
        // Logger.log('wallet', "DEBUG updateSyncProgress", masterId, chainId, masterWallet.getSubWallets())
        // Seems like we can sometimes receive an update progress about a subwallet not yet added. Reason unknown for now.
        if (!subWallet) {
            Logger.warn('wallet', "updateSyncProgress() called but subwallet with ID", chainId, "does not exist in wallet!", masterWallet);
            return;
        }

        await this.backupService.onSyncProgress(masterWallet, subWallet);

        if (!this.hasPromptTransfer2IDChain && (chainId === StandardCoinName.IDChain)) {
            const elaProgress = this.masterWallets[masterId].subWallets[StandardCoinName.ELA].progress;
            const idChainProgress = this.masterWallets[masterId].subWallets[StandardCoinName.IDChain].progress;

            // Check if it's a right time to prompt user for ID chain transfers, but only if we are fully synced.
            if (elaProgress === 100 && idChainProgress === 100) {
                this.checkIDChainBalance(masterId);
            }
        }

        if (progress === 100) {
            // ETHSC send event too often.
            if (chainId !== StandardCoinName.ETHSC) {
                await this.saveMasterWallet(masterWallet);
            }
        }
    }

    // ETHSC has different event
    private updateETHSCEventFromCallback(masterId: WalletID, chainId: StandardCoinName, result: SPVWalletMessage) {
        // Logger.log('wallet', '----updateETHSCEventFromCallback chainId:', chainId, ' result:', result);
        switch (result.event.Type) {
            case ETHSCEventType.EWMEvent: // update progress
                switch (result.event.Event) {
                    case ETHSCEventAction.PROGRESS:
                        // Logger.log('wallet', '----updateETHSCEventFromCallback masterId:', masterId, ' result.event:', result.event);
                        result.Progress =  Math.round(result.event.PercentComplete);
                        result.LastBlockTime = result.event.Timestamp;
                        break;
                    case ETHSCEventAction.CHANGED:
                        // if (('CONNECTED' === result.event.NewState) && ('CONNECTED' === result.event.OldState)) {
                        if ('CONNECTED' === result.event.NewState) {
                            result.Progress =  100;
                            result.LastBlockTime = new Date().getTime() / 1000;
                            // Logger.log('wallet', '----updateETHSCEventFromCallback set 100 masterId:', masterId, ' result.event:', result.event);
                        } else if ('DISCONNECTED' === result.event.NewState) {
                            result.Progress =  0;
                        } else {
                            // TODO
                            result.Progress =  0;
                        }
                        break;
                    default:
                        // Do nothing
                        break;
                }
                this.updateSyncProgress(masterId, chainId, result.Progress, result.LastBlockTime);
                const erc20SubWallets = this.getMasterWallet(masterId).getSubWalletsByType(CoinType.ERC20);
                for (const subWallet of erc20SubWallets) {
                    subWallet.updateSyncProgress(result.Progress, result.LastBlockTime);
                }
                break;
            case ETHSCEventType.WalletEvent: // update balance
                if (result.event.Event === ETHSCEventAction.BALANCE_UPDATED) {
                    // Logger.log('wallet', '----updateETHSCEventFromCallback BALANCE_UPDATED:', result, ' masterId:', masterId, ' chainId:', chainId);
                    this.getMasterWallet(masterId).getSubWallet(chainId).updateBalance();
                }
                break;
            case ETHSCEventType.TransferEvent:
                // Logger.log('wallet', '----updateETHSCEventFromCallback TransferEvent:', result, ' masterId:', masterId, ' chainId:', chainId);
                // ERC20 Token transfer
                // TODO: update the balance
                break;
            case ETHSCEventType.TokenEvent:
                // Logger.log('wallet', '----updateETHSCEventFromCallback TokenEvent:', result, ' masterId:', masterId, ' chainId:', chainId);
                // TODO
                break;
            default:
                // TODO: check other event
                break;
        }
    }

    private handleTransactionPublishedEvent(data: SPVWalletMessage) {
        let MasterWalletID = data.MasterWalletID;
        let chainId = data.ChainID;
        let hash = data.hash;

        let result = JSON.parse(data["result"]) as TxPublishedResult;
        let code = result.Code;
        let reason = result.Reason;

        let tx = "txPublished-";

        // TODO: messy again - what is the transaction map type? Mix of TxPublishedResult and SPVWalletMessage ?
        if (this.transactionMap[hash]) {
            this.transactionMap[hash].Code = code;
            this.transactionMap[hash].Reason = reason;
            this.transactionMap[hash].WalletID = MasterWalletID;
            this.transactionMap[hash].ChainID = chainId;
        } else {
            this.transactionMap[hash] = new TransactionMapEntry();
            this.transactionMap[hash].WalletID = MasterWalletID;
            this.transactionMap[hash].ChainID = chainId;
            this.transactionMap[hash].Code = code;
            this.transactionMap[hash].Reason = reason;

            this.localStorage.savePublishTxList(this.transactionMap);
        }

        if (code !== 0) {
            Logger.log('wallet', 'OnTxPublished fail:', JSON.stringify(data));
            this.popupProvider.ionicAlert_PublishedTx_fail('transaction-fail', tx + code, hash, reason);
            if (this.transactionMap[hash].lock !== true) {
                delete this.transactionMap[hash];
                this.localStorage.savePublishTxList(this.transactionMap);
            }
        }
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

    // for intent
    // TODO: What's this? lock what for what?
    lockTx(hash) {
        if (this.transactionMap[hash]) {
            this.transactionMap[hash].lock = true;
        } else {
            this.transactionMap[hash] = new TransactionMapEntry();
            this.transactionMap[hash].lock = true;

            this.localStorage.savePublishTxList(this.transactionMap);
        }
    }

    public getTxCode(hash) {
        let code = 0;
        if (this.transactionMap[hash].Code) {
            code = this.transactionMap[hash].Code;
        }

        if (this.transactionMap[hash].Status === 'Deleted') { // success also need delete
            delete this.transactionMap[hash];
            this.localStorage.savePublishTxList(this.transactionMap);
        } else {
            this.transactionMap[hash].lock = false;
        }

        return code;
    }

    cleanTransactionMap() {
        this.transactionMap = {};
        this.localStorage.savePublishTxList(this.transactionMap);
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

    /**
     * Voting requires to provide a list of invalid candidates.
     *
     * Here is an example:
     *
     * The vote information in the last vote transaction is
     * 1) vote 3 dpos nodes[D1,D2,D3, 3 ELA for each]
     * 2) vote proposal[P1, 10 ELA for it]
     * 3) impeach CR member[CR-1, 8 ELA for him]
     * 4) vote for CR Candidate [C1:2ELA, C2:5ELA]
     *
     * Now we want to vote to against a proposal P2, and deal with the data above, the result will be:
     *
     * 1) check if D1~D3 are valid now. If D3 is unregistered, D3 is illegal and need to pass into invalidCandidates
     * 2) check if Proposal P1 is still in Notification. If not, put it into invalidCandidates too. Otherwise, you need to record this data and add it to the new vote payload
     * 3) check if CR member CR-1 has been impeached and he is not a CR member now. If he is not a CR member now, we should put CR-1 into invalidCandidates.
     * 4) check whether it is in the election period. If it's not in the election period, we need to put C1 and C2 in invalidCandidates.
     */
    public async computeVoteInvalidCandidates(masterWalletId: string): Promise<InvalidCandidateForVote[]> {
        const helper = new InvalidVoteCandidatesHelper(this.http, this, masterWalletId, this.prefs);
        return await helper.computeInvalidCandidates();
    }

    async getAllMasterWalletBalanceByRPC() {
        for (const masterWallet of Object.values(this.masterWallets)) {
            await this.getAllSubwalletsBalanceByRPC(masterWallet.id);
        }
    }

    async getAllSubwalletsBalanceByRPC(masterWalletId) {
        const masterWallet = this.getMasterWallet(masterWalletId);
        const subwallets = masterWallet.subWalletsWithExcludedCoin(StandardCoinName.ETHSC, CoinType.STANDARD);
        let updatedByRPC = false;
        for (const subWallet of subwallets) {
            const updated = await (subWallet as MainAndIDChainSubWallet).getBalanceByRPC(this.jsonRPCService);
            if (updated) {
                updatedByRPC = true;
            }
        }

        if (updatedByRPC) {
            await this.saveMasterWallet(masterWallet);
        }
    }
}
