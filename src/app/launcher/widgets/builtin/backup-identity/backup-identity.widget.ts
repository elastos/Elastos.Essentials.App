import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DIDManagerService } from 'src/app/launcher/services/didmanager.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WidgetBase } from '../../base/widgetbase';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'widget-backup-identity',
  templateUrl: './backup-identity.widget.html',
  styleUrls: ['./backup-identity.widget.scss'],
})
export class BackupIdentityWidget extends WidgetBase implements OnInit, OnDestroy {
  public editing: boolean; // Widgets container is being edited

  public identityBackedUp = true;

  private activeIdentityBackedUpSub: Subscription = null;
  private editionModeSub: Subscription = null;

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();
  }

  ngOnInit() {
    // Watch identity backed up by user
    this.activeIdentityBackedUpSub = this.didSessions.activeIdentityBackedUp.subscribe(identityBackedUp => this.identityBackedUp = identityBackedUp);

    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    this.editionModeSub = WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.notifyReadyToDisplay();
  }

  ngOnDestroy(): void {
    if (this.activeIdentityBackedUpSub) {
        this.activeIdentityBackedUpSub.unsubscribe();
        this.activeIdentityBackedUpSub = null;
    }
    if (this.editionModeSub) {
        this.editionModeSub.unsubscribe();
        this.editionModeSub = null;
    }
  }

  backupIdentity() {
    void this.nav.navigateTo("identitybackup", "/identity/backupdid");
  }
}
