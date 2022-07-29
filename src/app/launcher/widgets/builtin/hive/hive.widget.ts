import { Component, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-hive',
  templateUrl: './hive.widget.html',
  styleUrls: ['./hive.widget.scss'],
})
export class HiveWidget implements Widget {
  public forSelection: boolean; // Initialized by the widget service

  public app: RunnableApp = {
    id: 'hive',
    routerContext: App.HIVE_MANAGER,
    name: this.translate.instant('launcher.app-hive'),
    description: this.translate.instant('launcher.app-hive-description'),
    icon: '/assets/launcher/apps/app-icons/hive.svg',
    hasWidget: true,
    startCall: () => this.hiveManagerInitService.start()
  };

  private vaultStatusSub: Subscription = null; // Subscription to vault link status event

  // Widget data
  public hiveVaultLinked = false;
  public hiveVaultStorageStats: {
    usedStorage: string; // Used storage, formatted for display, in GB
    maxStorage: string;  // Max storage, formatted for display, in GB
    usageRatio: number // usedStorage / maxStorage ratio, 0-1 numeric range
    percentUsage: string; // usedStorage / maxStorage ratio, 0-100% string
  } = null;

  constructor(
    private zone: NgZone,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    private globalHiveService: GlobalHiveService,
    private hiveManagerInitService: HiveManagerInitService
  ) { }

  onWidgetInit(): Promise<void> {
    // Wait to know user's hive vault status to show the hive storage widget
    this.vaultStatusSub = this.globalHiveService.vaultStatus.subscribe((vaultStatus) => {
      if (vaultStatus && vaultStatus.vaultInfo) {
        let usedStorageGb = vaultStatus.vaultInfo.getStorageUsed() / (1024 * 1024 * 1024);
        let maxStorageGb = vaultStatus.vaultInfo.getStorageQuota() / (1024 * 1024 * 1024);

        this.zone.run(() => {
          this.hiveVaultStorageStats = {
            usedStorage: usedStorageGb.toFixed(2),
            maxStorage: maxStorageGb.toFixed(2),
            usageRatio: usedStorageGb / maxStorageGb,
            percentUsage: (100 * usedStorageGb / maxStorageGb).toFixed(1)
          };
          this.hiveVaultLinked = true;
        });
      }
    });

    return;
  }

  onWidgetDeinit(): Promise<void> {
    if (this.vaultStatusSub) {
      this.vaultStatusSub.unsubscribe();
      this.vaultStatusSub = null;
    }
    return;
  }
}
