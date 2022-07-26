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
import { mnemonicToSeedSync } from "bip39";
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { Util } from 'src/app/model/util';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { AESEncrypt } from '../../helpers/crypto/aes';
import { CoinType } from '../model/coin';
import { LedgerAccountType } from '../model/ledger.types';
import { defaultWalletTheme, MasterWallet } from '../model/masterwallets/masterwallet';
import { MasterWalletBuilder } from '../model/masterwallets/masterwalletbuilder';
import { ElastosMainChainWalletNetworkOptions, LedgerAccountOptions, PrivateKeyType, SerializedLedgerMasterWallet, SerializedMasterWallet, SerializedStandardMasterWallet, SerializedStandardMultiSigMasterWallet, WalletCreator, WalletNetworkOptions, WalletType } from '../model/masterwallets/wallet.types';
import type { AnyNetworkWallet } from '../model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from '../model/networks/evms/evm.network';
import type { ERC20SubWallet } from '../model/networks/evms/subwallets/erc20.subwallet';
import type { MainCoinEVMSubWallet } from '../model/networks/evms/subwallets/evm.subwallet';
import { AnyNetwork } from '../model/networks/network';
import { AuthService } from './auth.service';
import { Transfer } from './cointransfer.service';
import { ERC1155Service } from './evm/erc1155.service';
import { ERC721Service } from './evm/erc721.service';
import { MultiSigService } from './multisig.service';
import { Native } from './native.service';
import { WalletNetworkService } from './network.service';
import { OfflineTransactionsService } from './offlinetransactions.service';
import { PopupProvider } from './popup.service';
import { SafeService } from './safe.service';
import { jsToSpvWalletId, SPVService } from './spv.service';
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

    public activeMasterWalletId: string = null;

    public masterWallets: {
        [index: string]: MasterWallet
    } = {};

    private networkWallets: {
        [index: string]: AnyNetworkWallet
    } = {};

    public hasPromptTransfer2IDChain = true;

    public needToPromptTransferToIDChain = false; // Whether it's time to ask user to transfer some funds to the ID chain for better user experience or not.

    public spvBridge: SPVService = null;

    private networkTemplate: string;

    public activeNetworkWallet = new BehaviorSubject<AnyNetworkWallet>(null);
    public walletServiceStatus = new BehaviorSubject<boolean>(false); // Whether the initial initialization is completed or not

    public subwalletTransactionStatus = new SubwalletTransactionStatus();

    constructor(
        public events: GlobalEvents,
        public native: Native,
        public zone: NgZone,
        public modalCtrl: ModalController,
        public translate: TranslateService,
        public localStorage: LocalStorage,
        private erc721Service: ERC721Service,
        private erc1155Service: ERC1155Service,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        private prefs: GlobalPreferencesService,
        private safeService: SafeService, // Keep this - init
        private networkService: WalletNetworkService,
        private globalNetworksService: GlobalNetworksService,
        private multiSigService: MultiSigService, // Keep for init
        private offlineTransactionsService: OfflineTransactionsService, // Keep for init
        private didSessions: GlobalDIDSessionsService
    ) {
        WalletService.instance = this;
    }

    async init() {
        Logger.log('wallet', "Wallet service is initializing");
        this.masterWallets = {};
        this.networkWallets = {};

        this.spvBridge = new SPVService(this.native, this.events, this.popupProvider);

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
        if (this.spvBridge)
            await this.spvBridge.destroy();

        await this.terminateActiveNetworkWallets();
        this.activeNetworkWallet.next(null);

        this.networkService.resetPriorityNetworkChangeCallback();

        this.masterWallets = {};
        this.networkWallets = {};
    }

    /**
     * Loads master wallet from disk and initializes them.
     */
    private async initWallets(): Promise<boolean> {
        Logger.log('wallet', "Initializing master wallets");

        try {
            this.networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();

            // Update the SPV SDK with the right network configuration
            await this.prepareSPVNetworkConfiguration();

            let signedInEntry = await this.didSessions.getSignedInIdentity();
            let rootPath = signedInEntry.didStoragePath;
            await this.spvBridge.init(rootPath);

            Logger.log('wallet', "Loading master wallets list");
            const idList = await this.localStorage.getWalletsList(this.networkTemplate);

            if (idList.length === 0) {
                Logger.log('wallet', "No master wallet found yet");
                return false;
            }

            Logger.log('wallet', `Got ${idList.length} wallets from storage`);

            // Rebuild our local model for all loaded wallets.
            for (let i = 0; i < idList.length; i++) {
                const masterId = idList[i];

                let serializedMasterWallet = await this.localStorage.loadMasterWallet(masterId);
                if (serializedMasterWallet) {
                    // Create a model instance from the persistent object.
                    this.masterWallets[masterId] = MasterWalletBuilder.newFromSerializedWallet(serializedMasterWallet);
                }
            }

            this.activeMasterWalletId = await this.getCurrentMasterIdFromStorage();
            Logger.log('wallet', 'Active master wallet id:', this.activeMasterWalletId)

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
    private async onActiveNetworkChanged(activatedNetwork: AnyNetwork): Promise<void> {
        // Terminate all the active network wallets
        await this.terminateActiveNetworkWallets();

        if (activatedNetwork) {
            Logger.log('wallet', 'Initializing network master wallet for active network:', activatedNetwork);

            this.networkWallets = {};
            let masterWalletsList = this.getMasterWalletsList()
            for (let i = 0; i < masterWalletsList.length; i++) {
                let masterWallet = masterWalletsList[i];
                Logger.log("wallet", "Creating network wallet for master wallet:", masterWallet);

                let networkWallet: AnyNetworkWallet = null;
                try {
                    networkWallet = await activatedNetwork.createNetworkWallet(masterWallet);
                    if (networkWallet)
                        this.networkWallets[masterWallet.id] = networkWallet;
                }
                catch (err) {
                    // TODO: Remove this "if" after we use the SPVSDK only for elastos, when everything else is migrated to JS
                    if (err.code == 20006) {
                        Logger.log("wallet", "Need to call IMasterWallet::VerifyPayPassword():", masterWallet, err);
                        // We don't call verifyPayPassword for the wallet imported by private key on BTC network.
                        if ((activatedNetwork instanceof EVMNetwork) || (masterWallet.hasMnemonicSupport())) {
                            // 20006: Need to call IMasterWallet::VerifyPayPassword() or re-import wallet first.
                            // A password is required to generate a public key in spvsdk.
                            // Usually occurs when a new network is first supported, eg. EVM, BTC.
                            const payPassword = await this.authService.getWalletPassword(masterWallet.id);
                            if (payPassword) {
                                await this.spvBridge.verifyPayPassword(jsToSpvWalletId(masterWallet.id), payPassword);
                                try {
                                    networkWallet = await activatedNetwork.createNetworkWallet(masterWallet);
                                }
                                catch (err) {
                                    Logger.error("wallet", "createNetworkWallet error", masterWallet, err)
                                }
                                if (networkWallet)
                                    this.networkWallets[masterWallet.id] = networkWallet;
                            }
                        }
                    } else {
                        Logger.error("wallet", "Failed to create network wallet for master wallet", masterWallet, err);
                    }
                }
                finally {
                    // Notify that this network wallet is the active one.
                    // If the network wallet creation failed for any reason, we still want to set the active network
                    // to "null" to not get an ankward situation with a new network and the old network wallet.
                    if (masterWallet.id === this.activeMasterWalletId) {
                        Logger.log("wallet", "Setting the network wallet as active one:", networkWallet);
                        this.activeNetworkWallet.next(networkWallet);
                    }
                }
            }
        }
    }

    private async terminateActiveNetworkWallets(): Promise<void> {
        for (let networkWallet of this.getNetworkWalletsList()) {
            if (networkWallet)
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

        Logger.log('wallet', "Setting SPV network config to ", this.networkTemplate, networkConfig);
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

    /**
     * Sets the new network wallet to the given value, and also sets the active master wallet to the
     * network wallet's master wallet.
     * In case the network wallet is null (can happen if the master wallet is not supported on the
     * network), then a forced masted wallet must be passed to still change the active master wallet even
     * without network wallet
     */
    public async setActiveNetworkWallet(networkWallet: AnyNetworkWallet, forcedMasterWallet?: MasterWallet): Promise<void> {
        if (networkWallet && forcedMasterWallet)
            throw new Error("setActiveNetworkWallet(): networkWallet and forcedMasterWallet cannot be both used at the same time");

        if (!networkWallet && !forcedMasterWallet)
            throw new Error("setActiveNetworkWallet(): either networkWallet or forcedMasterWallet must be passed");

        if (networkWallet) {
            Logger.log('wallet', 'Changing the active master wallet to', networkWallet.masterWallet.id);
            await this.setActiveMasterWallet(networkWallet.masterWallet.id);
        }
        else {
            Logger.log('wallet', 'Changing the active master wallet (forced) to', forcedMasterWallet.id);
            await this.setActiveMasterWallet(forcedMasterWallet.id);
        }

        Logger.log('wallet', 'Changing the active network wallet to', networkWallet);
        this.activeNetworkWallet.next(networkWallet);
    }

    public async setActiveMasterWallet(masterId: string): Promise<void> {
        Logger.log('wallet', 'Requested to set active master wallet to:', masterId);
        if (masterId && (this.masterWallets[masterId])) {
            this.activeMasterWalletId = masterId;
            await this.localStorage.saveCurMasterId(this.networkTemplate, { masterId: masterId });
        }
    }

    public getMasterWallet(masterId: string): MasterWallet {
        if (masterId === null)
            throw new Error("getMasterWallet() can't be called with a null ID");
        return this.masterWallets[masterId];
    }

    public getActiveNetworkWallet(): AnyNetworkWallet {
        return this.activeNetworkWallet.value;
    }

    public getActiveNetworkWalletIndex(): number {
        if (!this.activeNetworkWallet.value)
            return -1;

        return this.getNetworkWalletsList().findIndex(w => {
            return w.id === this.activeNetworkWallet.value.id
        });
    }

    public getActiveMasterWalletIndex(): number {
      if (!this.activeNetworkWallet.value)
          return -1;

      return this.getMasterWalletsList().findIndex(w => {
          return w.id === this.activeNetworkWallet.value.id
      });
  }

    public getNetworkWalletFromMasterWalletId(masterId: string): AnyNetworkWallet {
        return Object.values(this.networkWallets).find(w => w.id === masterId);
    }

    /**
     * Gets the list of master wallets, sorted alphabetically.
     */
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
    public getNetworkWalletsList(): AnyNetworkWallet[] {
        if (this.networkService.isActiveNetworkEVM()) {
            // return all network wallets.
            return Object.values(this.networkWallets);
        } else {
            if (!WalletNetworkService.instance.activeNetwork.value)
                return [];

            return Object.values(this.networkWallets).filter(nw => nw.masterWallet.supportsNetwork(nw.network));
        }
    }

    /**
     * Tries to find the standard "main" EVM subwallet that has the given address in the list of
     * all subwallets for the active network
     */
    public async findStandardEVMSubWalletByAddress(address: string): Promise<MainCoinEVMSubWallet<any>> {
        for (let networkWallet of this.getNetworkWalletsList()) {
            let mainEVMSubWallet = networkWallet.getMainEvmSubWallet();
            if (mainEVMSubWallet) {
                let walletAddress = await mainEVMSubWallet.getCurrentReceiverAddress();
                if (walletAddress === address)
                    return mainEVMSubWallet;
            }
        }
        return null;
    }

    /**
     * Tries to find the a ERC20 subwallet tfor a given token address in the list of
     * all subwallets for the active network
     */
    public async findERC20SubWalletByContractAddress(tokenContractAddress: string, evmAddress: string): Promise<ERC20SubWallet> {
        for (let networkWallet of this.getNetworkWalletsList()) {
            let mainEVMSubWallet = networkWallet.getMainEvmSubWallet();
            if (mainEVMSubWallet) {
                let walletAddress = await mainEVMSubWallet.getCurrentReceiverAddress();
                if (walletAddress === evmAddress) {
                    // Found the right network wallet. Now check its subwallets
                    let erc20SubWallets = networkWallet.getSubWalletsByType(CoinType.ERC20);
                    for (let sw of erc20SubWallets as ERC20SubWallet[]) {
                        if (sw.coin.getContractAddress() === tokenContractAddress)
                            return sw;
                    }
                }
            }
        }
        return null;
    }

    private goToLauncherScreen() {
        this.native.setRootRouter("/wallet/settings", {
            createWallet: true
        });
    }

    public async getCurrentMasterIdFromStorage(): Promise<string> {
        const data = await this.localStorage.getCurMasterId(this.networkTemplate);
        if (data && data["masterId"] && this.masterWallets[data["masterId"]]) {
            return data["masterId"];
        } else {
            // Compatibility with older versions that didn't store the current masterId.
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
     * Creates a new unique master wallet ID
     */
    public createMasterWalletID(): string {
        // Previous SPVSDK wallet ID format was a 6 digits HEX string.
        // For wallets stored now by essentials (not by the SPVSDK), we append a ".2" suffix for easier debugging, less confusion.
        return Util.uuid(6, 16) + ".2";
    }

    /**
     * Creates a new standard master wallet using a given mnemonic.
     * The new master wallet is saved to storage, and instanciated/added to the local model.
     */
    public async newStandardWalletWithMnemonic(
        masterId: string,
        walletName: string,
        mnemonicStr: string,
        mnemonicPassphrase: string,
        payPassword: string,
        networkOptions: WalletNetworkOptions[], // elastos -> single address
        walletCreator: WalletCreator,
        activateAfterCreation = true
    ): Promise<MasterWallet> {
        Logger.log('wallet', "Importing new master wallet with mnemonic");

        let hasPassphrase = false;
        if (mnemonicPassphrase && mnemonicPassphrase.length > 0) {
            Logger.log('wallet', "A passphrase is being used");
            hasPassphrase = true;
        }

        // Calculate the seed key from mnemonic + passphrase
        let seed = mnemonicToSeedSync(mnemonicStr, mnemonicPassphrase).toString('hex');

        let masterWalletInfo: SerializedStandardMasterWallet = {
            type: WalletType.STANDARD,
            id: masterId,
            name: walletName,
            theme: defaultWalletTheme(),
            seed: await AESEncrypt(seed, payPassword),
            mnemonic: await AESEncrypt(mnemonicStr, payPassword),
            hasPassphrase,
            networkOptions,
            creator: walletCreator
        }

        return this.createMasterWalletFromSerializedInfo(masterWalletInfo, activateAfterCreation);
    }

    /**
     * Creates a new standard master wallet using a given private key.
     * The new master wallet is saved to storage, and instanciated/added to the local model.
     */
    public async newStandardWalletWithPrivateKey(
        walletId: string,
        walletName: string,
        privateKey: string,
        privateKeyType: PrivateKeyType,
        // TODO networkOptions: WalletNetworkOptions[] // elastos -> single address
        payPassword: string
    ): Promise<MasterWallet> {
        Logger.log('wallet', "Importing new master wallet with priv key");

        let masterWalletInfo: SerializedStandardMasterWallet = {
            type: WalletType.STANDARD,
            id: walletId,
            name: walletName,
            theme: defaultWalletTheme(),
            privateKey: await AESEncrypt(privateKey, payPassword),
            privateKeyType,
            networkOptions: [], // TODO: get options from UI params
            creator: WalletCreator.USER
        }

        return this.createMasterWalletFromSerializedInfo(masterWalletInfo);
    }

    /**
     * Creates a new ledger master wallet.
     * The new master wallet is saved to storage, and instanciated/added to the local model.
     */
    public newLedgerWallet(
        masterId: string,
        walletName: string,
        deviceID: string,
        accountID: string, // Wallet address
        accountIndex: number, // Derivation index - not used for now, forward compatibility in case we stop using the accountPath directly later
        accountPath: string, // Derivation path
        accountType: LedgerAccountType,
        publicKey = ''
    ): Promise<MasterWallet> {
        Logger.log('wallet', "Importing new legder master wallet");

        // TODO: Save account with saveContextInfo?
        let accountOptions: LedgerAccountOptions[] = [{
            type: accountType,
            accountID,
            accountPath,
            publicKey
        }]
        let masterWalletInfo: SerializedLedgerMasterWallet = {
            type: WalletType.LEDGER,
            id: masterId,
            name: walletName,
            theme: defaultWalletTheme(),
            networkOptions: [], // TODO: We may not have this at all for ledger? Should this move to standard wallet?
            creator: WalletCreator.USER,
            deviceID,
            accountOptions
        }

        return this.createMasterWalletFromSerializedInfo(masterWalletInfo);
    }

    /**
     * Creates a new ledger master wallet.
     * The new master wallet is saved to storage, and instanciated/added to the local model.
     */
    public newMultiSigStandardWallet(
        masterId: string,
        walletName: string,
        signingWalletId: string,
        requiredSigners: number,
        signersExtPubKeys: string[]
    ): Promise<MasterWallet> {
        Logger.log('wallet', "Creating a new standard multi-sig master wallet");

        let masterWalletInfo: SerializedStandardMultiSigMasterWallet = {
            type: WalletType.MULTI_SIG_STANDARD,
            id: masterId,
            name: walletName,
            theme: defaultWalletTheme(),
            networkOptions: [
                // TODO
                {
                    network: "elastos",
                    singleAddress: true
                } as ElastosMainChainWalletNetworkOptions
            ],
            creator: WalletCreator.USER,
            signingWalletId,
            requiredSigners,
            signersExtPubKeys
        }

        return this.createMasterWalletFromSerializedInfo(masterWalletInfo);
    }

    /**
     * Saves a NEW "JS" wallet into the local model (not related to the legacy SPVSDK).
     */
    public async createMasterWalletFromSerializedInfo(walletInfo: SerializedMasterWallet, activateAfterCreation = true, networkTemplate?: string): Promise<MasterWallet> {
        let wallet = MasterWalletBuilder.newFromSerializedWallet(walletInfo);

        // Add a new wallet to our local model
        this.masterWallets[wallet.id] = wallet;

        // Save state to local storage
        await wallet.save();

        // Add to persistant list of wallets
        await this.saveWalletsList(networkTemplate);

        if (activateAfterCreation)
            await this.activateMasterWallet(wallet);

        return wallet;
    }

    /**
     * Loads wallet in memory a master wallet in memory and create the associated network wallet
     * as well for the currently active network.
     */
    public async activateMasterWallet(wallet: MasterWallet) {
        Logger.log('wallet', "Adding master wallet to local model", wallet.id, wallet.name);

        // Build the associated network Wallet
        let activeNetwork = this.networkService.activeNetwork.value;
        let masterWallet = this.masterWallets[wallet.id];
        let networkWallet = await activeNetwork.createNetworkWallet(masterWallet);

        this.networkWallets[wallet.id] = networkWallet; // It's ok to be a null network wallet

        if (!networkWallet) {
            Logger.warn("wallet", "Failed to create network wallet", masterWallet, activeNetwork);
        }

        // Notify that this network wallet is the active one
        // NOTE: even if the network wallet creation fails we still make it active to let wallet home display something
        if (networkWallet)
            await this.setActiveNetworkWallet(networkWallet);
        else
            await this.setActiveNetworkWallet(null, masterWallet);
    }

    /**
     * Saves the current list of wallets to persistant storage
     */
    private saveWalletsList(networkTemplate?: string): Promise<void> {
        // Used forced, or active network template
        if (!networkTemplate)
            networkTemplate = this.networkTemplate;

        return this.localStorage.saveWalletsList(networkTemplate, this.getMasterWalletsList().map(mw => mw.id));
    }

    /**
     * CAUTION - Empties the local list of master wallets. Used primarily for the wallet migration
     * scripts, should never be used anywhere else as other model entries and events are not handled
     * here!
     */
    public clearMasterWalletsList() {
        this.masterWallets = {};
    }

    /**
     * Destroy a master wallet, active or not, based on its id.
     *
     * triggerEvent: If the wallet is deleted by the system, no related event need be triggered
     */
    async destroyMasterWallet(id: string, triggerEvent = true) {
        if (!this.masterWallets[id]) {
            Logger.warn('wallet', `destroyMasterWallet(): master wallet with ID ${id} does not exist!`);
            return;
        }

        // Stop background updates.
        let networkwallet = this.getNetworkWalletFromMasterWalletId(id);
        if (networkwallet) {
          await networkwallet.stopBackgroundUpdates();
        }

        try {
            await this.masterWallets[id].destroy();
        }
        catch (e) {
            // Can't destroy? continue anyway, we need to let user remove the wallet and not be stuck with it.
            Logger.warn("wallet", "Failed to destroy the master wallet in destroy() but continuing", e);
        }

        // Save this modification to our permanent local storage
        await this.localStorage.deleteMasterWallet(this.masterWallets[id].id);

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
                if (networkWalletList && networkWalletList[0]) {
                    await this.setActiveNetworkWallet(networkWalletList[0]);
                    this.native.setRootRouter("/wallet/wallet-home");
                } else {
                    this.activeNetworkWallet.next(null);
                    this.goToLauncherScreen();
                }
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
