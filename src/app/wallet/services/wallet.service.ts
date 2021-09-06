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
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { Events } from 'src/app/services/events.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Network } from '../model/networks/network';
import { SPVWalletPluginBridge } from '../model/SPVWalletPluginBridge';
import { WalletAccount, WalletAccountType } from '../model/WalletAccount';
import { MasterWallet, WalletID } from '../model/wallets/masterwallet';
import { NetworkWallet } from '../model/wallets/networkwallet';
import { AuthService } from './auth.service';
import { Transfer } from './cointransfer.service';
import { ERC721Service } from './erc721.service';
import { Native } from './native.service';
import { WalletNetworkService } from './network.service';
import { PopupProvider } from './popup.service';
import { LocalStorage } from './storage.service';


class SubwalletTransactionStatus {
    private subwalletSubjects = new Map<string, BehaviorSubject<number>>();

    public get(subwalletSubjectId: string): BehaviorSubject<number> {
        if (!this.subwalletSubjects.has(subwalletSubjectId)) {
            let subject = new BehaviorSubject<number>(-1);
            this.subwalletSubjects.set(subwalletSubjectId, subject);
        }
        return this.subwalletSubjects.get(subwalletSubjectId);
    }

    public set(subwalletSubjectId: string, count: number) {
        // Create the subject if needed, and emit an update event.
        this.get(subwalletSubjectId).next(count);
    }
}

export enum WalletStateOperation {
    // Wallet just got created
    CREATED,
    // Wallet just got deleted
    DELETED,
    // Wallet just became active (selected as the active wallet by the user)
    BECAME_ACTIVE
}

// {'ELA':{}, 'ETHSC': {chainid ... }, etc}
export type SPVNetworkConfig = { [networkName: string]: JSONObject };

@Injectable({
    providedIn: 'root'
})
export class WalletService {
    public static instance: WalletService = null;

    public activeMasterWalletId = null;

    public masterWallets: {
        [index: string]: MasterWallet
    } = {};

    private networkWallets: {
        [index: string]: NetworkWallet
    } = {};

    public hasPromptTransfer2IDChain = true;

    public needToCheckUTXOCountForConsolidation = true;
    public needToPromptTransferToIDChain = false; // Whether it's time to ask user to transfer some funds to the ID chain for better user experience or not.

    public spvBridge: SPVWalletPluginBridge = null;

    private networkTemplate: string;

    public activeNetworkWallet = new BehaviorSubject<NetworkWallet>(null);
    public walletServiceStatus = new BehaviorSubject<boolean>(false); // Whether the initial initialization is completed or not

    public subwalletTransactionStatus = new SubwalletTransactionStatus();

    constructor(
        public events: Events,
        public native: Native,
        public zone: NgZone,
        public modalCtrl: ModalController,
        public translate: TranslateService,
        public localStorage: LocalStorage,
        private erc721Service: ERC721Service,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        private prefs: GlobalPreferencesService,
        private networkService: WalletNetworkService,
        private globalNetworksService: GlobalNetworksService,
        private didSessions: GlobalDIDSessionsService,
    ) {
        WalletService.instance = this;
    }

    async init() {
        Logger.log('wallet', "Master manager is initializing");
        this.masterWallets = {};

        this.spvBridge = new SPVWalletPluginBridge(this.native, this.events, this.popupProvider);

        const hasWallets = await this.initWallets();

        // Manually initialize the network wallets the first time.
        await this.onActiveNetworkChanged(this.networkService.activeNetwork.value);

        this.networkService.setPriorityNetworkChangeCallback(activatedNetwork => {
            return this.onActiveNetworkChanged(activatedNetwork);
        });

        if (!hasWallets) {
            this.walletServiceStatus.next(true);
            this.events.publish("walletmanager:initialized");
            return;
        }

        this.hasPromptTransfer2IDChain = await this.localStorage.get('hasPrompt') ?? false;

        Logger.log('wallet', "Wallet manager initialization complete");

        this.events.publish("walletmanager:initialized");
        this.walletServiceStatus.next(true);
    }

    async stop() {
        Logger.log('wallet', "Wallet service is stopping");
        await this.spvBridge.destroy();

        await this.terminateActiveNetworkWallets();
    }

    private async initWallets(): Promise<boolean> {
        Logger.log('wallet', "Initializing wallets");

        try {
            this.networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();

            // Update the SPV SDK with the right network configuration
            await this.prepareSPVNetworkConfiguration();
            console.log("AFTER PREPARE");

            let signedInEntry = await this.didSessions.getSignedInIdentity();
            let rootPath = signedInEntry.didStoragePath;
            await this.spvBridge.init(rootPath);

            Logger.log('wallet', "Getting all master wallets from the SPV SDK");
            const idList = await this.spvBridge.getAllMasterWallets();

            if (idList.length === 0) {
                Logger.log('wallet', "No SPV wallet found, going to launcher screen");
                //this.goToLauncherScreen();
                return false;
            }

            Logger.log('wallet', "Got " + idList.length + " wallets from the SPVSDK");

            // Rebuild our local model for all wallets returned by the SPV SDK.
            for (let i = 0; i < idList.length; i++) {
                const masterId = idList[i];

                Logger.log('wallet', "Rebuilding local model for wallet id " + masterId);

                // Try to retrieve locally storage extended info about this wallet
                if (!(await MasterWallet.extendedInfoExistsForMasterId(masterId))) {
                    // No backward compatibility support: old wallets are just destroyed.
                    await this.spvBridge.destroyWallet(masterId);
                    continue;
                }
                else {
                    Logger.log('wallet', "Found extended wallet info for master wallet id " + masterId);

                    // Create a model instance for each master wallet returned by the SPV SDK.
                    this.masterWallets[masterId] = new MasterWallet(this, this.erc721Service, this.localStorage, masterId);
                    await this.masterWallets[masterId].prepareAfterCreation();
                }
            }

            this.activeMasterWalletId = await this.getCurrentMasterIdFromStorage();
            Logger.log('wallet', 'active master wallet id:', this.activeMasterWalletId)

            return Object.values(this.masterWallets).length > 0;
        } catch (error) {
            Logger.error('wallet', 'initWallets error:', error);
            return false;
        }
        return true;
    }

    /**
     * Called when the active network changes (by user, or initially).
     * At this time, we need to refresh the displayed wallet content (tokens, subwallets...) for the
     * newly active network. This happens through the creation of a whole new set of network wallets
     * for each master wallet.
     */
    private async onActiveNetworkChanged(activatedNetwork: Network): Promise<void> {
        // Terminate all the active network wallets
        await this.terminateActiveNetworkWallets();

        if (activatedNetwork) {
            Logger.log('wallet', 'Initializing network master wallet for active network:', activatedNetwork);

            for (let masterWallet of this.getMasterWalletsList()) {
                Logger.log("wallet", "Creating network wallet for master wallet:", masterWallet);
                let networkWallet = await activatedNetwork.createNetworkWallet(masterWallet);
                this.networkWallets[masterWallet.id] = networkWallet;

                // Notify that this network wallet is the active one
                if (masterWallet.id === this.activeMasterWalletId) {
                    Logger.log("wallet", "Setting the network walelt as active one:", networkWallet);
                    this.activeNetworkWallet.next(networkWallet);
                }
            }
        }
    }

    private async terminateActiveNetworkWallets(): Promise<void> {
        for (let networkWallet of this.getNetworkWalletsList()) {
            await networkWallet.stopBackgroundUpdates();
        }
    }

    private async prepareSPVNetworkConfiguration(): Promise<void> {
        let spvsdkNetwork = this.networkTemplate;

        if (this.networkTemplate === "LRW") {
            spvsdkNetwork = "PrvNet";
        }

        // Ask each network to fill its configuration for the SPVSDK.
        // For EVM networks, this means adding something like {'ETHxx': {ChainID: 123, NetworkID: 123}}
        let networkConfig: SPVNetworkConfig = {};
        for (let network of this.networkService.getAvailableNetworks()) {
            network.updateSPVNetworkConfig(networkConfig, this.networkTemplate);
        }

        Logger.log('wallet', "Setting network to ", this.networkTemplate, networkConfig);
        await this.spvBridge.setNetwork(spvsdkNetwork, JSON.stringify(networkConfig));
        // await this.spvBridge.setLogLevel(WalletPlugin.LogType.DEBUG);
    }

    public getActiveMasterWallet() {
        if (this.activeMasterWalletId) {
            return this.masterWallets[this.activeMasterWalletId];
        } else {
            return null;
        }
    }

    public async setActiveNetworkWallet(networkWallet: NetworkWallet): Promise<void> {
        Logger.log('wallet', 'Changing the active network wallet to', networkWallet);
        this.activeNetworkWallet.next(networkWallet);
        await this.setActiveMasterWallet(networkWallet.masterWallet.id);
    }

    public async setActiveMasterWallet(masterId: WalletID): Promise<void> {
        Logger.log('wallet', 'Requested to set active master wallet to:', masterId);
        if (masterId && (this.masterWallets[masterId])) {
            this.activeMasterWalletId = masterId;
            await this.localStorage.saveCurMasterId(this.networkTemplate, { masterId: masterId });
        }
    }

    public getMasterWallet(masterId: WalletID): MasterWallet {
        if (masterId === null)
            throw new Error("getMasterWallet() can't be called with a null ID");
        return this.masterWallets[masterId];
    }

    public getActiveNetworkWallet(): NetworkWallet {
        return this.activeNetworkWallet.value;
    }

    public getNetworkWalletFromMasterWalletId(masterId: WalletID): NetworkWallet {
        return Object.values(this.networkWallets).find(w => w.id === masterId);
    }

    public getMasterWalletsList(): MasterWallet[] {
        return Object.values(this.masterWallets).sort((a, b) => {
            return a.name > b.name ? 1 : -1;
        });
    }

    public getMasterWalletsCount(): number {
        return Object.values(this.masterWallets).length;
    }

    public walletNameExists(name: string): boolean {
        const existingWallet = Object.values(this.masterWallets).find((wallet) => {
            return wallet.name === name;
        });
        return existingWallet != null;
    }

    /**
     * Returns the list of network wallets, based on the list of master wallets, for the
     * active network.
     */
    public getNetworkWalletsList(): NetworkWallet[] {
        return Object.values(this.networkWallets);
    }

    private goToLauncherScreen() {
        this.native.setRootRouter('/wallet/launcher');
    }

    public async getCurrentMasterIdFromStorage(): Promise<string> {
        const data = await this.localStorage.getCurMasterId(this.networkTemplate);
        if (data && data["masterId"] && this.masterWallets[data["masterId"]]) {
            return data["masterId"];
        } else {
            // Compatible with older versions.
            let walletList = this.getMasterWalletsList();
            if (walletList.length > 0) {
                await this.setActiveMasterWallet(walletList[0].id);
                return walletList[0].id;
            } else {
                return null;
            }
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

        await this.addMasterWalletToLocalModel(masterId, walletName, account, true);

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

        await this.addMasterWalletToLocalModel(masterId, walletName, account, false);
    }

    private async addMasterWalletToLocalModel(id: WalletID, name: string, walletAccount: WalletAccount, newWallet: boolean) {
        Logger.log('wallet', "Adding master wallet to local model", id, name);

        // Add a new wallet to our local model
        this.masterWallets[id] = new MasterWallet(this, this.erc721Service, this.localStorage, id, name);

        // Set some wallet account info
        this.masterWallets[id].account = walletAccount;

        // Get some basic information ready in our model.
        await this.masterWallets[id].populateWithExtendedInfo(null);

        // Save state to local storage
        await this.masterWallets[id].save();

        // Built networkWallet
        let activeNetwork = this.networkService.activeNetwork.value;
        let networkWallet = await activeNetwork.createNetworkWallet(this.masterWallets[id]);
        this.networkWallets[id] = networkWallet;
        // Notify that this network wallet is the active one
        await this.setActiveNetworkWallet(networkWallet);
    }

    /**
     * Destroy a master wallet, active or not, base on its id.
     *
     * triggerEvent: If the wallet is deleted by the system, no related event need be triggered
     */
    async destroyMasterWallet(id: string, triggerEvent = true) {
        // Delete all subwallet
        // TODO await this.masterWallets[id].destroyAllSubWallet();

        // Destroy the wallet in the wallet plugin
        await this.spvBridge.destroyWallet(id);

        // Save this modification to our permanent local storage
        await this.localStorage.setExtendedMasterWalletInfo(this.masterWallets[id].id, null);

        // Destroy from our local model
        delete this.masterWallets[id];

        // Delete the networkwallet
        delete this.networkWallets[id];

        // When importing did, the default wallet will be created.
        // In this process, a multi address wallet will be created first,
        // If it is detected that this is a single address wallet, then the multi address wallet will be deleted.
        // In this case, we do not need to triggle event and delete password.
        if (triggerEvent) {
            // Notify some listeners
            this.events.publish("masterwallet:destroyed", id);

            if (Object.values(this.networkWallets).length > 0) {
                let networkWalletList = this.getNetworkWalletsList();
                await this.setActiveNetworkWallet(networkWalletList[0]);
                this.native.setRootRouter("/wallet/wallet-home");
            } else {
                this.activeNetworkWallet.next(null);
                this.goToLauncherScreen();
            }
        }
    }

    public setHasPromptTransfer2IDChain() {
        this.hasPromptTransfer2IDChain = true;
        this.needToPromptTransferToIDChain = false;
        return this.localStorage.set('hasPrompt', true); // TODO: rename to something better than "hasPrompt"
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
