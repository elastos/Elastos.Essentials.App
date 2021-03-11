import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LocalStorage } from './storage.service';
import { MasterWallet } from '../model/wallets/MasterWallet';
import { SubWallet } from '../model/wallets/SubWallet';
import { StandardSubWallet } from '../model/wallets/StandardSubWallet';
import { Coin, StandardCoinName } from '../model/Coin';
import { MainchainSubWallet } from '../model/wallets/MainchainSubWallet';
import moment from "moment";
import { AppService } from './app.service';
import { WalletManager } from './wallet.service';
import { CoinService } from './coin.service';
import { PopupProvider } from './popup.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from './events.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { Logger } from 'src/app/logger';
import { Interfaces, Hive } from "@elastosfoundation/elastos-connectivity-sdk-cordova";

declare let essentialsIntent: EssentialsIntentPlugin.Intent;
declare let walletManager: WalletPlugin.WalletManager;
declare let hiveManager: HivePlugin.HiveManager;

@Injectable({
  providedIn: 'root'
})
export class BackupRestoreService {
  private static SHOW_DEBUG_LOGS = true;

  private initializationComplete = false;
  private userVault: HivePlugin.Vault = null;
  private backupRestoreHelper: Hive.DataSync.HiveDataSync;
  private subWalletBackupInProgress = false;
  private walletsList: MasterWallet[] = [];
  private fullySuccessfulSyncExpected = true;
  private activeNetwork: string = null; // MainNet, TestNet, PrvNet

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private appService: AppService,
    private events: Events,
    private coinService: CoinService,
    private popup: PopupProvider,
    public translate: TranslateService,
    private prefs: GlobalPreferencesService
  ) {
  }

  async init() {
    this.log("BackupRestoreService Initializing");

    await this.loadActiveNetwork();

    // Check if we have a vault already configured or not
    let userDID = await this.storage.get("backup-user-with-vault-did");
    if (userDID) {
      // DID and vault already configured - we can automatically initialize the backup mechanism.
      this.logDebug("A user DID is already configured for the backup service. Using it.", userDID);
      await this.setupBackupHelper();
    }

    this.initializationComplete = true;
  }

  public initialized(): boolean {
    return this.initializationComplete;
  }

  public vaultIsConfigured(): boolean {
    return (this.userVault !== null);
  }

  /**
   * Gets and saves current blockchain network (mainnet, testnet) from the preferences.
   */
  private async loadActiveNetwork(): Promise<void> {
    return new Promise(async (resolve, reject)=>{
      this.activeNetwork = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, "chain.network.type");
      resolve();
    });
  }

  // TODO: how to make it easier for all apps to connect to Hive, without opening the did app every time
  // Can we make the app did intent silent ? -> Problem: it requires master password

  /**
   * Called whenever user's hive vault is enabled in the app. From this point, we can setup the backup helper
   * and start syncing to the vault.
   */
  public async activateVaultAccess() {
    const result = await this.setupBackupHelper();
    if (!result) {
        return false;
    }

    // After a manual vault activation, we start a sync immediatelly, to be able to restore sync states
    // after a wallet reinstallation.
    await this.checkSync(WalletManager.instance.getWalletsList());
    return true;
  }

  private async setupBackupHelper() {
    this.log("Backup helper setup starting");

    const didHelper = new ElastosSDKHelper().newDIDHelper("wallet");
    let credential: DIDPlugin.VerifiableCredential = await didHelper.getExistingAppIdentityCredential();
    if (!credential) {
      credential = await didHelper.generateAppIdCredential();
      if (!credential) {
        // maybe user cancelled this action.
        this.logDebug("Maybe cancelled or no credential?");
        return false;
      }
    }
    const userDID = credential.getIssuer();
    this.logDebug("Current user DID:", userDID);

    this.userVault = null;

    // Check if user has a vault
    let vaultAddress = await Hive.Utils.getVaultProviderAddress(userDID);
    if (!vaultAddress) {
      this.logWarn("No hive vault provider for for current DID. Asking to configure.");
      // PROBLEM HERE? On IOS, ionicPrompt() call seems to print error: {} and block the whole app...
      let shouldConfigure = await this.popup.ionicPrompt(this.translate.instant('hive-not-configured-title'), this.translate.instant('hive-not-configured-text'), null, this.translate.instant('hive-not-configured-configure'), this.translate.instant('hive-not-configured-not-now'));
      if (shouldConfigure) {
        this.logDebug("User wants to configure his vault");
        // User wants to configure his hive vault, redirect him
        await this.suggestUserToSetupVault();
        return false; // Vault activation cannot be immediate. Don't start the backup service for now.
      }
      else {
        this.logDebug("User does not want to configure his vault");
        // User doesn't want to configure hive now.
        return false;
      }
    }

    const hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper("wallet");
    const hiveClient = await hiveAuthHelper.getClientWithAuth();
    this.log("Got hive client. Resolving vault...", hiveClient);

    try {
      this.userVault = await hiveClient.getVault(userDID);
    }
    catch (e) {
      this.logWarn("getVault() exception", e);
      return false;
    }

    if (!this.userVault) {
      this.log("No vault activated, not doing any backup");
      return false;
    }

    // TMP TEST
    //this.fetchAndPrintFilesRec("/");
    // TMP TEST END

    // Save the fact that we now have a configured vault info to use for backups
    await this.storage.set("backup-user-with-vault-did", userDID);

    this.log("Using vault for user:", this.userVault.getVaultOwnerDid(), "at:", this.userVault.getVaultProviderAddress());

    this.backupRestoreHelper = new ElastosSDKHelper().newHiveDataSync("wallet", this.userVault, true);
    this.log("Backup restore helper initialized", this.backupRestoreHelper);
    return true;
  }

  /**
   * In order to get a permanent wallet context key after reinstallation and across devices, we use
   * the first address of the ELA subwallet.
   *
   * A different context is used for different chain networks in order to not mix sync states from different
   * chains.
   */
  private async getWalletSyncContextName(wallet: MasterWallet): Promise<string> {
    let rootAddress = await this.getWalletFirstELAAddress(wallet);
    // CU-jv00d3: We need to remember the address mode because the sync data format is different and if user re-imports
    // His wallet with a different mode, the restored data breaks the wallet.
    let singleMultiAddress = (wallet.account.SingleAddress ? "single" : "multi");
    return "walletbackup-" + this.activeNetwork + singleMultiAddress + "-" + rootAddress;
  }

  private async getWalletFirstELAAddress(wallet: MasterWallet): Promise<string> {
    // Get the ELA subwallet inside this wallet
    let elaSubWallet = wallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
    return await elaSubWallet.getRootPaymentAddress();
  }

  public async setupBackupForWallet(wallet: MasterWallet) {
    if (!this.backupRestoreHelper) {
      // No vault / backup service initialized yet - forget this request for now.
      this.logDebug("Backup restore helper not initialized. Skipping backup setup for wallet", wallet);
      return;
    }

    this.walletsList.push(wallet);

    this.logDebug("Initializing backup sync context for wallet", wallet);

    let walletContextName = await this.getWalletSyncContextName(wallet);
    await this.backupRestoreHelper.addSyncContext(walletContextName, async (entry) => {
      // insertion
      this.logDebug("Insertion request from the backup helper", entry)
      return await this.handleRemoteBackupEntryChanged(entry);
    }, async (entry) => {
      // modification
      this.logDebug("Modification request from the backup helper", entry)
      return await this.handleRemoteBackupEntryChanged(entry);
    }, async (entry) => {
      // deletion
      this.logDebug("Deletion request from the backup helper", entry)
      // Nothing to do: we don't sync deleted wallets for now.
      return true;
    });

    // We are maybe adding a new wallet. We must make sure that a full successful sync is completed before
    // doing more backups, not not overwrite what could exist on the vault.
    this.fullySuccessfulSyncExpected = true;
  }

  private async sleep(durationMs: number): Promise<void> {
    return new Promise((resolve)=>{
      setTimeout(()=>{
        resolve();
      }, durationMs)
    })
  }

  // DEBUG ONLY - TO TEST SYNC RESTORATION
  public async testInstantELAStateDownload(wallets: MasterWallet[]) {
    // Stop all on going wallets synchronization first
    this.logDebug("Stopping on going subwallets sync");
    for (let wallet of wallets) {
      await WalletManager.instance.stopWalletSync(wallet.id);
    }

    for (let wallet of wallets) {
      for (let subWallet of Object.values(wallet.subWallets)) {
        let fileName = this.getSubwalletBackupFileName(subWallet);
        if (fileName) {
          this.logDebug("FORCE downloading file", fileName);
          let restoreResult = await this.downloadAndSaveSPVSyncStateFile(wallet, subWallet, this.getSubwalletBackupFileName(subWallet));
          this.logDebug("FORCED DOWNLOAD RESULT:", restoreResult);
        }
      }
    }

    // Restart all wallets synchronizations
    this.logDebug("Restarting subwallets sync");
    for (let wallet of wallets) {
        await WalletManager.instance.startWalletSync(wallet.id);
    }
  }

  /**
   * Main entry point to initiate a backup synchronization
   */
  public async checkSync(wallets: MasterWallet[]): Promise<boolean> {
    if (!this.userVault) {
      // No user vault available
      this.logDebug("No user vault available, skipping sync check for wallets backup");
      return false;
    }

    this.logDebug("Check sync is starting");

    let syncResult = true;

    try {
      // Stop all on going wallets synchronization first
      this.logDebug("Stopping on going subwallets sync");
      for (let wallet of wallets) {
        await WalletManager.instance.stopWalletSync(wallet.id);
        await this.sleep(5000);
      }

      // Start the remote sync process
      this.log("Starting backup helper sync()");
      let fullSyncCompleted = await this.backupRestoreHelper.sync(false);
      if (fullSyncCompleted) {
        this.logDebug("Backup helper sync() was fully completed.");

        this.fullySuccessfulSyncExpected = false;

        // Send updated data of local subwallets to the vault if it's a right time to do so.
        for (let wallet of wallets) {
          for (let subWallet of Object.values(wallet.subWallets)) {
            if (!this.supportedWalletForBackup(subWallet)) {
              continue;
            }

            this.logDebug("Checking if subwallet needs to be backup now", wallet, subWallet);
            this.checkBackupSubWallet(wallet, subWallet);
          }
        }
      }
    }
    catch (e) {
      // Network error, provider is broken, etc
      Logger.error("wallet", e);
      syncResult = false;
    }

    // Restart all wallets synchronizations
    this.logDebug("Restarting subwallets sync");
    for (let wallet of wallets) {
        await WalletManager.instance.startWalletSync(wallet.id);
    }

    return syncResult;
  }

  private async checkBackupSubWallet(masterWallet: MasterWallet, subWallet: SubWallet) {
    let walletContextName = await this.getWalletSyncContextName(masterWallet);

    this.logDebug("checkBackupSubWallet()", masterWallet, subWallet)
    if (!this.supportedWalletForBackup(subWallet)) {
      return;
    }

    if (this.fullySuccessfulSyncExpected) {
      // We are requested to not allow doing more backups until a full sync is successful.
      this.logDebug("Fully successful sync is expected. Not doing a backup now.");
      return;
    }

    let existingLocalEntry = await this.backupRestoreHelper.getDatabaseEntry(walletContextName, subWallet.id);

    // Check if it's a good time to backup the wallet - mostly meaning that enough time has elapsed since last sync.
    if (!existingLocalEntry || await this.goodTimeToBackupWallet(masterWallet, subWallet)) {
      if (this.subWalletBackupInProgress) {
        return;
      }

      this.subWalletBackupInProgress = true;

      let entryData = {
        walletKey: await this.getWalletFirstELAAddress(masterWallet), // Constant reference to the parent master wallet
        lastSyncDate: subWallet.syncTimestamp // Timestamp in MS at which this subwallet was last modified
      };
      this.logDebug("It's a good time to backup:", masterWallet, subWallet);

      // Stop wallet sycn to make sure the SPV SDK doesn't keep writing while we read that .db file
      await WalletManager.instance.stopSubWalletSync(masterWallet.id, subWallet.id as StandardCoinName);

      // Upload the sync state file that is related to the given subwallet (ela.db, idchain.db...)
      let fileName = this.getSubwalletBackupFileName(subWallet)
      this.logDebug("Uploading file", fileName);
      if (await this.getAndUploadSPVSyncStateFile(masterWallet, fileName)) {
        this.logDebug("File successfully uploaded. Upserting database entry", entryData);
        await this.backupRestoreHelper.upsertDatabaseEntry(walletContextName, subWallet.id, entryData);
        this.markSubwalletAlreadyBackupDuringThisSession(masterWallet, subWallet);
      }
      else {
        this.logError("Failed to upload file "+fileName+" to the vault");
      }

      await WalletManager.instance.startSubWalletSync(masterWallet.id, subWallet.id as StandardCoinName);

      this.subWalletBackupInProgress = false;
    }
    else {
      this.logDebug("Not a good time to backup:", masterWallet, subWallet);
    }
  }

  private getSubwalletBackupFileName(subWallet: SubWallet): string {
    switch (subWallet.id) {
      case StandardCoinName.ELA:
        return "ELA.db";
      case StandardCoinName.IDChain:
        return "IDChain.db";
      default:
        return null;
    }
  }

  public async onSyncProgress(masterWallet: MasterWallet, subWallet: StandardSubWallet) {
    if (!this.vaultIsConfigured()) {
      return;
    }
    await this.checkBackupSubWallet(masterWallet, subWallet);
  }

  private supportedWalletForBackup(subWallet: SubWallet): boolean {
    return subWallet.id == StandardCoinName.ELA || subWallet.id == StandardCoinName.IDChain;
  }

  private async getAndUploadSPVSyncStateFile(masterWallet: MasterWallet, backupFileName: string): Promise<boolean> {
    this.logDebug("Uploading vault file", backupFileName, masterWallet);

    try {
      // Reader to read the local spv state sync file on the device
      let reader = await walletManager.getBackupFile(masterWallet.id, backupFileName);

      // Writer to upload the spv sync state file to the vault
      let walletContextKey = await this.getWalletSyncContextName(masterWallet);
      let vaultFilePath = "sync/" + walletContextKey + "/" + backupFileName;
      let vaultWriter = await this.userVault.getFiles().upload(vaultFilePath);

      let readContent: Uint8Array = null;
      while (true) {
        readContent = await reader.read(20000);
        if (readContent && readContent.length > 0) {
          await vaultWriter.write(readContent);
          await vaultWriter.flush();
        }
        else
          break; // No more content to read, stop looping.
      }
      await vaultWriter.close();
      await reader.close();

      this.logDebug("File " + backupFileName + " successfully uploaded to the vault");
      return true;
    }
    catch (e) {
      this.logError("Exception while uploading sync state file to vault: " + e);
      return false;
    }
  }

  private async downloadAndSaveSPVSyncStateFile(masterWallet: MasterWallet, subWallet: SubWallet, backupFileName: string): Promise<{wasRestored:boolean, fileNotFound?: boolean}> {
    this.logDebug("Downloading vault file", backupFileName, masterWallet);

    let walletContextKey = await this.getWalletSyncContextName(masterWallet);
    let vaultFilePath = "sync/" + walletContextKey + "/" + backupFileName;

    let vaultReader: HivePlugin.Files.Reader = null;
    try {
      vaultReader = await this.userVault.getFiles().download(vaultFilePath);
    }
    catch (err) {
      if (hiveManager.errorOfType(err, HivePlugin.EnhancedErrorType.FILE_NOT_FOUND)) {
        this.logWarn("The target file was not found on the vault, this is strange but as we don't want to remain blocked by this, we just don't restore this wallet state and we continue.");
        return {
          wasRestored: false,
          fileNotFound: true
        }
      }
      else {
        Logger.log("wallet", "File download failed", err);
        return {
          wasRestored: false,
          fileNotFound: false
        }
      }
    }

    try {
      let writer = await walletManager.restoreBackupFile(masterWallet.id, backupFileName);

      // Before restoring the sync file, we must destroy the subwallet and we'll re-add it later.
      // This is for now the only way to let the SPVSDK reload the file.
      await masterWallet.destroySubWallet(subWallet.id);

      let readContent: Uint8Array = null;
      while (true) {
        readContent = await vaultReader.read(20000);
        if (readContent && readContent.length > 0) {
          await writer.write(readContent);
        }
        else
          break; // No more content to read, stop looping.
      }
      await vaultReader.close();
      await writer.close();

      await masterWallet.createSubWallet(this.coinService.getCoinByID(subWallet.id));

      this.logDebug("File downloaded and saved successfully");
      return {
        wasRestored: true
      };
    }
    catch (e) {
      Logger.error("wallet", e);
      this.logError("Exception while downloading sync state file from vault: "+e);
      return {
        wasRestored: false, fileNotFound: false
      };
    }
  }

  private async findWalletByFirstELAAddress(elaAddress: string): Promise<MasterWallet> {
    for (let wallet of this.walletsList) {
      let elaSubWallet = wallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
      let rootAddress = await elaSubWallet.getRootPaymentAddress();
      if (rootAddress == elaAddress)
        return wallet;
    }

    return null;
  }

  /**
   * A wallet that does not exist locally exists on the vault backup. We must restore it locally.
   */
  private async handleRemoteBackupEntryChanged(entry: Hive.DataSync.BackupRestoreEntry): Promise<boolean> {
    this.logDebug("handleRemoteBackupEntryChanged()", entry);

    // Compare the remote lastsyncdate vs local
    let remoteLastSyncDate = entry.data.lastSyncDate; // Timestamp MS

    let wallet = await this.findWalletByFirstELAAddress(entry.data.walletKey);
    if (wallet) {
      // We've found the local wallet. Now look for the subwallet.
      let subWallet = wallet.getSubWallet(entry.key) as StandardSubWallet;
      if (subWallet) {
        let localLastSyncDate = subWallet.syncTimestamp;
        // If remote last sync date is more recent, download and restore files
        if (remoteLastSyncDate > localLastSyncDate) {
          this.logDebug("Remote sync date is more recent than local. We have to download the latest file version from the vault");
          let restoreResult = await this.downloadAndSaveSPVSyncStateFile(wallet, subWallet, this.getSubwalletBackupFileName(subWallet));
          if (restoreResult.wasRestored) {
            this.logDebug("Local sync file updated successfully with the most recent vault version");
            return true;
          }
          else {
            if (restoreResult.fileNotFound) {
              this.logWarn("SPV state sync failed, but continuing the synchronization with success.");
              return true;
            }
            else {
              this.logWarn("Failed to download vault sync file");
              return false;
            }
          }
        }
        else {
          // Local is more recent, don't restore.
          this.logDebug("Local sync date is more recent than remote", wallet, subWallet, remoteLastSyncDate, localLastSyncDate)
          return true;
        }
      }
      else {
        this.logDebug("Trying to handle a remote entry change but subwallet does not exist", wallet, entry.key);
        return false;
      }
    }
    else {
      // No wallet found for the given root address, which means user must first re-import his mnemonic.
      // At that time we can sync with remote data later.
      this.logDebug("No existing local wallet found for root address", entry.data.walletKey);
      return false;
    }
  }

  private subwalletsBackedUpDuringCurrentSession = {}; // Subwallet ids
  private subwalletAlreadyBackupDuringThisSession(masterWallet: MasterWallet, subwallet: SubWallet): boolean {
    let key = masterWallet.id+subwallet.id;
    return key in this.subwalletsBackedUpDuringCurrentSession;
  }

  private markSubwalletAlreadyBackupDuringThisSession(masterWallet: MasterWallet, subwallet: SubWallet) {
    let key = masterWallet.id+subwallet.id;
    this.subwalletsBackedUpDuringCurrentSession[key] = true;
  }

  private async goodTimeToBackupWallet(wallet: MasterWallet, subWallet: SubWallet): Promise<boolean> {
    let walletContextName = await this.getWalletSyncContextName(wallet);
    let localBackupEntry = await this.backupRestoreHelper.getDatabaseEntry(walletContextName, subWallet.id);

    if (!localBackupEntry) {
      // Can't find a local backup entry, so this means we are called for a wallet that has no scheduled
      // backup yet. So, it's a good time to backup, because it's the very first time.
      return true;
    }

    // It's a good time to backup if the new subwallet sync date is more recent than X days/minutes from
    // the previous sync (because we don't want to backup too often to save network bandwidth).
    let stdSubWallet = subWallet as StandardSubWallet;
    let walletSyncDate = moment(stdSubWallet.syncTimestamp);
    let backupEntryDate = moment(localBackupEntry.data.lastSyncDate);

    // Backup max once every 2 days (sync date), and only if not backup yet during a elastOS session (to save bandwidth during the initial sync)
    let subwalletAlreadyBackedUp = this.subwalletAlreadyBackupDuringThisSession(wallet, stdSubWallet);
    this.logDebug("Good time to backup wallet?", walletSyncDate, backupEntryDate, "Subwallet already backed up ?", subwalletAlreadyBackedUp);
    if (walletSyncDate.isAfter(backupEntryDate.add(2, "days")) && !subwalletAlreadyBackedUp) {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Master wallet is being destroyed locally. We delete its backup entry locally but not on the vault, so
   * that we will be able to sync from vault if the wallet is re-created (otherwise a full deletion would also)
   * delete sync state from the vault.
   */
  public async removeBackupTrackingForWallet(masterId: string) {
    if (!this.vaultIsConfigured()) {
      return;
    }

    this.logDebug("Removing all local backup entries for the wallet, without syncing this deletion to the vault.");

    let wallet = WalletManager.instance.getMasterWallet(masterId);
    let contextName = await this.getWalletSyncContextName(wallet);

    for (let subWallet of wallet.getSubWallets()) {
      await this.backupRestoreHelper.deleteDatabaseEntry(contextName, subWallet.id, true);
    }
  }

  private log(message: any, ...params: any) {
    Logger.log("wallet", "BackupRestoreService: ", message, ...params);
  }

  private logDebug(message: any, ...params: any) {
    if (BackupRestoreService.SHOW_DEBUG_LOGS)
      Logger.log("wallet", "BackupRestoreService: ", message, ...params);
  }

  private logWarn(message: any, ...params: any) {
    Logger.warn("wallet", "BackupRestoreService: ", message, ...params);
  }

  private logError(message: any, ...params: any) {
    Logger.error("wallet", "BackupRestoreService: ", message, ...params);
  }

  private fetchAndPrintFilesRec(path: string): Promise<void> {
    this.logDebug("Fetching files list at: "+path);
    return new Promise((resolve)=>{
      this.userVault.getFiles().list(path).then(async (files)=>{
        this.logDebug("GOT FILES LIST AT: "+path);
        for (let file of files) {
          this.logDebug("FILE "+path+"/"+file.name,": size= "+file.size);

          if (file.type == HivePlugin.Files.FileType.FOLDER) {
            let subPath = path;
            if (!subPath.endsWith("/"))
              subPath = subPath + "/";
            subPath = subPath + file.name;

            await this.fetchAndPrintFilesRec(subPath);
          }
        }
      });
    });
  }

  public suggestUserToSetupVault(): Promise<void> {
   return new Promise((resolve)=>{
     Logger.log("wallet", "Asking hive manager dApp to configure a vault for current user.");
     essentialsIntent.sendIntent("https://hive.elastos.net/setupvaultprompt", {});
   });
 }
}
