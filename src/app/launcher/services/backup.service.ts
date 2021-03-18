import { Injectable } from '@angular/core';

class RestoredApp {
  appId: string;
  isFavorite: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  /* TODO @chad - Probably needs to be totally deleted as we don't install apps dynamically any more

  private backupRestoreHelper: TrinitySDK.Backup.BackupRestoreHelper;
  private userVault: HivePlugin.Vault;

  public restoredApps: RestoredApp[] = [];

  constructor(
    private didService: DidmanagerService,
    private translate: TranslateService,
    private installService: InstallService,
    private events: Events
  ) { }

  async init() {
    try {
      const hiveAuthHelper = new TrinitySDK.Hive.AuthHelper();

      const hiveClient = await hiveAuthHelper.getClientWithAuth((authError)=>{
        Logger.warn('Launcher', "Hive authentication error callback: ", authError);
      });
      Logger.log('Launcher', "Hive client initialization complete");

      const userDID = this.didService.getUserDID();

      Logger.log('Launcher', "Getting current user's vault instance");
      this.userVault = await hiveClient.getVault(userDID);
      if (!this.userVault) {
        Logger.log('Launcher', "Failed to get user's vault. Maybe none if configured yet. Backup service not starting for now");
        return;
      }

      Logger.log('Launcher', "User vault retrieved. Now creating a new backup restore helper instance");

      this.backupRestoreHelper = new TrinitySDK.Backup.BackupRestoreHelper(this.userVault, true);

      this.restoredApps = [];
      this.backupRestoreHelper.addSyncContext("installedApp",
        async (entry) => {
          // Add backup locally
          Logger.log('Launcher', "Addition request from backup helper", entry);
          await this.addAppEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Modify backup locally
          Logger.log('Launcher', "Modify request from the backup helper", entry);
          await this.modifyAppEntryLocally(entry.data);
          return true;

        }, async (entry) => {
          // Delete backup locally
          Logger.log('Launcher', "Deletion request from the backup helper", entry);
          await this.deleteAppEntryLocally(entry.data.appId);
          return true;
        }
      );

      Logger.log('Launcher', "Starting backup restore sync");
      await this.backupRestoreHelper.sync();
    } catch (e) {
      // We could get a hive exception here
      Logger.error('Launcher', "Catched exception during backup service initialization:");
      Logger.error('Launcher', e);
    }
  }

  async addAppEntryLocally(data: RestoredApp) {
    const appId = data.appId;
    const appAlreadyInBackup = this.restoredApps.find((app) => app.appId === appId);
    const targetAppInfo: EssentialsIntentPlugin.AppInfo = this.installService.appInfos.find((app) => app.id === appId);

    if (!appAlreadyInBackup) {
      this.restoredApps.push(data);
    }
    if (!targetAppInfo) {
      Logger.log('Launcher', 'Backup.service: starting backup for app', appId);
      titleBarManager.showActivityIndicator(
        TitleBarPlugin.TitleBarActivityType.DOWNLOAD,
        this.translate.instant('restoring-backup')
      );

      const epkPath = await this.installService.downloadApp(appId);
      if (epkPath) {
        Logger.log('Launcher', 'EPK file downloaded and saved to ' + epkPath);
        const appInstalled = await this.installService.installApp(epkPath, appId);

        if (appInstalled) {
          Logger.log('Launcher', 'Restore app install successful');
          this.installService.newAppInstalled = true;
          this.events.publish("updateFavorites", data);
        }
      }

      this.installService.resetProgress();
    }
  }

  async modifyAppEntryLocally(data: RestoredApp) {
    this.restoredApps.map((app) => {
      if (app.appId === data.appId) {
        app.isFavorite = data.isFavorite;
      }
    });

    await this.events.publish("updateFavorites", data);
  }

  async deleteAppEntryLocally(appId: string) {
    this.restoredApps = this.restoredApps.filter((app) => app.appId !== appId);
    await this.installService.unInstallApp(appId);
  }

  async upsertDatabaseEntry(context: string, key: string, data: HivePlugin.JSONObject): Promise<void> {
    try {
      Logger.log('Launcher', 'Local restored apps', this.restoredApps);
      Logger.log('Launcher', 'upsertDatabaseEntry called for entry', context, key);
      await this.backupRestoreHelper.upsertDatabaseEntry(context, key, data);
    } catch (e) {
      Logger.error('Launcher', 'BackupService upsertDatabaseEntry error:', e);
    }
  }

  async deleteDatabaseEntry(contextName: string, key: string): Promise<void> {
    try {
      Logger.log('Launcher', 'Backup restored apps', this.restoredApps);
      Logger.log('Launcher', 'deleteDatabaseEntry called for entry', contextName, key);
      await this.backupRestoreHelper.deleteDatabaseEntry(contextName, key);
    } catch (e) {
      Logger.error('Launcher', 'BackupService deleteDatabaseEntry error:', e);
    }
  }
  */
}
