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

import { SPVWalletPluginBridge } from '../model/SPVWalletPluginBridge';
import { MasterWallet, WalletID } from '../model/wallets/masterwallet';
import { CoinID, StandardCoinName } from '../model/coin';
import { WalletAccountType, WalletAccount } from '../model/walletaccount';
import { SerializedSubWallet } from '../model/wallets/subwallet';
import { CoinService } from './coin.service';
import { WalletJsonRPCService } from './jsonrpc.service';
import { PopupProvider } from './popup.service';
import { Native } from './native.service';
import { LocalStorage } from './storage.service';
import { AuthService } from './auth.service';
import { Transfer } from './cointransfer.service';
import { MainchainSubWallet } from '../model/wallets/elastos/mainchain.subwallet';
import { ElastosEVMSubWallet } from '../model/wallets/elastos/elastos.evm.subwallet';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { StandardSubWalletBuilder } from '../model/wallets/standardsubwalletbuilder';
import { ERC721Service } from './erc721.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { Util } from '../model/util';
import { WalletConfig } from '../model/wallet.config';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { WalletNetworkService } from './network.service';
import { NetworkWallet } from '../model/wallets/NetworkWallet';
import { ElastosNetworkWallet } from '../model/wallets/elastos/networkwallet';
import { HecoNetworkWallet } from '../model/wallets/heco/networkwallet';


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
// TODO: replace this with activeMasterWallet?
export type WalletStateChange = {
    wallet: MasterWallet;
    operation: WalletStateOperation;
}

@Injectable({
    providedIn: 'root'
})
export class WalletService {
    public static instance: WalletService = null;

    public activeMasterWalletId = null;

    public masterWallets: {
        [index: string]: MasterWallet
    } = {};

    private  networkWallets: {
        [index: string]: NetworkWallet
    } = {};

    public hasPromptTransfer2IDChain = true;

    public needToCheckUTXOCountForConsolidation = true;
    public needToPromptTransferToIDChain = false; // Whether it's time to ask user to transfer some funds to the ID chain for better user experience or not.

    public spvBridge: SPVWalletPluginBridge = null;

    private networkTemplate: string;

    public activeMasterWallet = new BehaviorSubject<MasterWallet>(null);
    public activeNetworkWallet = new BehaviorSubject<NetworkWallet>(null);
    public walletServiceStatus = new BehaviorSubject<boolean>(false); // Whether the initial initialization is completed or not
    public walletStateChanges = new Subject<WalletStateChange>(); // Whenever a master wallet becomes created, deleted or active

    public subwalletTransactionStatus = new SubwalletTransactionStatus();

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
        public jsonRPCService: WalletJsonRPCService,
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

        this.networkService.activeNetwork.subscribe(activeNetwork => {
            void this.onActiveNetworkChanged();
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
      await this.spvBridge.destroy();
    }

    private async initWallets(): Promise<boolean> {
        Logger.log('wallet', "Initializing wallets");

        try {
            // NetWork Type
            this.networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
            let spvsdkNetwork = this.networkTemplate;
            let networkConfig = null;

            if (this.networkTemplate === "PrvNet") { // TODO - rework for network templates
              networkConfig = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'chain.network.config');
            } else {
              networkConfig = WalletConfig.getNetConfig(this.networkTemplate);
              if (this.networkTemplate === "LRW") {
                spvsdkNetwork = "PrvNet";
              }
            }
            Logger.log('wallet', "Setting network to ", this.networkTemplate, networkConfig);
            await this.spvBridge.setNetwork(spvsdkNetwork, JSON.stringify(networkConfig));
            // await this.spvBridge.setLogLevel(WalletPlugin.LogType.DEBUG);

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

            Logger.log('wallet', "Got "+idList.length+" wallets from the SPVSDK");

            // Rebuild our local model for all wallets returned by the SPV SDK.
            for (let i = 0; i < idList.length; i++) {
                const masterId = idList[i];

                Logger.log('wallet', "Rebuilding local model for wallet id "+masterId);

                // Try to retrieve locally storage extended info about this wallet
                if (!(await MasterWallet.extendedInfoExistsForMasterId(masterId))) {
                    // No backward compatibility support: old wallets are just destroyed.
                    await this.spvBridge.destroyWallet(masterId);
                    continue;
                }
                else {
                    Logger.log('wallet', "Found extended wallet info for master wallet id " + masterId);

                    // Create a model instance for each master wallet returned by the SPV SDK.
                    this.masterWallets[masterId] = new MasterWallet(this, this.coinService, this.erc721Service, this.localStorage, masterId);
                    await this.masterWallets[masterId].prepareAfterCreation();
                }
            }

            this.activeMasterWalletId = await this.getCurrentMasterIdFromStorage();
            Logger.log('wallet', 'active master wallet id:', this.activeMasterWalletId)
            this.activeMasterWallet.next(this.activeMasterWalletId);

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
    private async onActiveNetworkChanged(): Promise<void> {
        let activeNetwork = this.networkService.activeNetwork.value;
        Logger.log('wallet', 'Initializing network master wallet for active network:', activeNetwork);

        for (let masterWallet of this.getMasterWalletsList()) {
            let networkWallet: NetworkWallet = null;
            if (activeNetwork.key === "elastos")
                networkWallet = new ElastosNetworkWallet(masterWallet);
            else if (activeNetwork.key === "heco")
                networkWallet = new HecoNetworkWallet(masterWallet);

            await networkWallet.initialize();
            this.networkWallets[masterWallet.id] = networkWallet;

            // Notify that this network wallet is the active one
            if (masterWallet.id === this.activeMasterWalletId)
                this.activeNetworkWallet.next(networkWallet);
        }
    }

    public getActiveMasterWallet() {
        if (this.activeMasterWalletId) {
          return this.masterWallets[this.activeMasterWalletId];
        } else {
          return null;
        }
    }

    public async setActiveMasterWallet(masterId: WalletID) {
      Logger.log('wallet', 'setActiveMasterWallet ', masterId);
      if (masterId && (this.masterWallets[masterId])) {
          this.activeMasterWalletId = masterId;
          await this.localStorage.saveCurMasterId(this.networkTemplate, { masterId: masterId });
          this.activeMasterWallet.next(this.activeMasterWalletId);
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
        this.masterWallets[id] = new MasterWallet(this, this.coinService, this.erc721Service, this.localStorage, id, name);

        // Set some wallet account info
        this.masterWallets[id].account = walletAccount;

        // Get some basic information ready in our model.
        await this.masterWallets[id].populateWithExtendedInfo(null);

       /* TODO
        await this.masterWallets[id].createSubWallet(this.coinService.getCoinByID(StandardCoinName.ETHHECO));
 */
        // Get all tokens and create subwallet
        await this.masterWallets[id].updateERCTokenList();

        // Save state to local storage
        await this.masterWallets[id].save();

        await this.setActiveMasterWallet(id);

        // Notify listeners
        this.walletStateChanges.next({
            wallet: this.masterWallets[id],
            operation: WalletStateOperation.CREATED
        });
    }

    /**
     * Destroy a master wallet, active or not, base on its id.
     *
     * triggleEvent: If the wallet is deleted by the system, no related event need be triggered
     */
    async destroyMasterWallet(id: string, triggleEvent = true) {
        // Delete all subwallet
        // TODO await this.masterWallets[id].destroyAllSubWallet();

        // Destroy the wallet in the wallet plugin
        await this.spvBridge.destroyWallet(id);

        // Save this modification to our permanent local storage
        await this.localStorage.setExtendedMasterWalletInfo(this.masterWallets[id].id, null);

        // Destroy from our local model
        delete this.masterWallets[id];

        // When importing did, the default wallet will be created.
        // In this process, a multi address wallet will be created first,
        // If it is detected that this is a single address wallet, then the multi address wallet will be deleted.
        // In this case, we do not need to triggle event and delete password.
        if (triggleEvent) {
          // Notify some listeners
          this.events.publish("masterwallet:destroyed", id);
          this.walletStateChanges.next({
              wallet: this.masterWallets[id],
              operation: WalletStateOperation.DELETED
          });

          if (Object.values(this.masterWallets).length > 0) {
              let walletList = this.getMasterWalletsList();
              await this.setActiveMasterWallet(walletList[0].id);
              this.native.setRootRouter("/wallet/wallet-home");
          } else {
              await this.setActiveMasterWallet(null);
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

    /**
     * Creates a wallet that uses the same mnemonic as the DID.
     * Usually this method should be called only once per new DID created, so the newly created
     * user also has a default wallet.
     */
    public async createWalletFromNewIdentity(walletName: string, mnemonic: string, mnemonicPassphrase: string): Promise<void> {
        Logger.log("wallet", "Creating wallet from new identity");
        let masterWalletId = Util.uuid(6, 16);
        const payPassword = await this.authService.createAndSaveWalletPassword(masterWalletId);
        if (payPassword) {
          try {
            // First create multi address wallet.
            await this.importWalletWithMnemonic(
              masterWalletId,
              walletName,
              mnemonic,
              mnemonicPassphrase || "",
              payPassword,
              false
            );

            // Get the elastos network wallet instance to know if this wallet is single or multi address, as
            // we want to return this information.
            let elastosNetworkWallet = new ElastosNetworkWallet(this.masterWallets[masterWalletId]);
            if (await elastosNetworkWallet.multipleAddressesInUse()) {
                Logger.log('wallet', 'Multi address wallet!')
                return;
            }

            Logger.log('wallet', 'Single address wallet!')
            // Not multi address wallet, delete multi address wallet and create a single address wallet.
            await this.destroyMasterWallet(masterWalletId, false);
            await this.importWalletWithMnemonic(
              masterWalletId,
              walletName,
              mnemonic,
              mnemonicPassphrase || "",
              payPassword,
              true
            );
          }
          catch (err) {
            Logger.error('wallet', 'Wallet import error:', err);
          }
        }
    }
}
