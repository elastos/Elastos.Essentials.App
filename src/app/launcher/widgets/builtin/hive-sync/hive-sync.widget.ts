import { Component, OnDestroy, OnInit } from '@angular/core';
import { customizedSVGID } from 'src/app/helpers/picture.helpers';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-hive-sync',
  templateUrl: './hive-sync.widget.html',
  styleUrls: ['./hive-sync.widget.scss'],
})
export class HiveSyncWidget extends WidgetBase implements OnInit, OnDestroy {
  public editing: boolean; // Widgets container is being edited

  public needToPromptHiveSync = false;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private globalHiveService: GlobalHiveService,
    private prefs: GlobalPreferencesService
  ) {
    super();
  }

  ngOnInit() {
    void this.globalHiveService.getSyncDataToHiveWasPrompted().then(prompted => {
      this.needToPromptHiveSync = !prompted

      this.notifyReadyToDisplay();
    });

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

  public customizeSVGID = customizedSVGID;
}
