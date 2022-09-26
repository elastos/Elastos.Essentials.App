import { Component, OnDestroy, OnInit } from '@angular/core';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IWidget } from '../../base/iwidget';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-hive-sync',
  templateUrl: './hive-sync.widget.html',
  styleUrls: ['./hive-sync.widget.scss'],
})
export class HiveSyncWidget implements IWidget, OnInit, OnDestroy {
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
    void this.globalHiveService.getSyncDataToHiveWasPrompted().then(prompted => this.needToPromptHiveSync = !prompted);

    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });
  }

  ngOnDestroy(): void {
  }

  public async refuseSync() {
    await this.globalHiveService.setSyncDataToHiveWasPrompted();
    await this.prefs.setUseHiveSync(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, false);

    this.needToPromptHiveSync = false;
  }

  public async continue() {
    let confirmed = await this.globalHiveService.showHiveSyncInfoPopup();
    if (confirmed) {
      this.needToPromptHiveSync = false;
    }
  }
}
