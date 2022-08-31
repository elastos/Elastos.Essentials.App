import { Component, OnDestroy, OnInit } from '@angular/core';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { Widget } from '../../base/widget.interface';
import { WidgetsService } from '../../services/widgets.service';

@Component({
  selector: 'widget-hive-sync',
  templateUrl: './hive-sync.widget.html',
  styleUrls: ['./hive-sync.widget.scss'],
})
export class HiveSyncWidget implements Widget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  public needToPromptHiveSync = false;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private globalHiveService: GlobalHiveService,
    private prefs: GlobalPreferencesService
  ) { }

  ngOnInit() {
    void this.globalHiveService.getSyncDataToHiveWasPrompted().then(sync => this.needToPromptHiveSync = !sync);

    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsService.instance.editionMode.subscribe(editing => {
      this.editing = editing;
    });
  }

  ngOnDestroy(): void {
  }

  public async refuseSync() {
    await this.globalHiveService.setSyncDataToHiveWasPrompted();
    await this.prefs.setUseHiveSync(DIDSessionsStore.signedInDIDString, false);

    this.needToPromptHiveSync = false;
  }

  public async continue() {
    let confirmed = await this.globalHiveService.showHiveSyncInfoPopup();
    if (confirmed) {
      this.needToPromptHiveSync = false;
    }
  }
}
