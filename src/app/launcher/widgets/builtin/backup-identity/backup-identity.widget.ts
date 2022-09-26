import { Component, OnDestroy, OnInit } from '@angular/core';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IWidget } from '../../base/iwidget';
import { WidgetState } from '../../base/widgetstate';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-backup-identity',
  templateUrl: './backup-identity.widget.html',
  styleUrls: ['./backup-identity.widget.scss'],
})
export class BackupIdentityWidget implements IWidget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  public identityNeedsBackup = false;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private didSessions: GlobalDIDSessionsService
  ) { }

  async ngOnInit() {
    this.identityNeedsBackup = !(await this.didSessions.activeIdentityWasBackedUp());

    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });
  }

  ngOnDestroy(): void {
  }

  attachWidgetState(widgetState: WidgetState) {
  }

  backupIdentity() {
    void this.nav.navigateTo("identitybackup", "/identity/backupdid");
  }
}
