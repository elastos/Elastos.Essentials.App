import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DIDService } from '../../services/did.service';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {

  public warning = "";
  public password = "";

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDService,
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
  ) { }

  ngOnInit() {
    Logger.log('Identity', 'Warning popup', this.warning);
    this.warning = this.navParams.get('warning');
    this.password = this.navParams.get('password');
  }

  getDisplayableHeader() {
    if (this.warning === 'publishIdentity') {
      return this.translate.instant('identity.publish-identity');
    } else {
      return this.translate.instant('identity.publish-visibility');
    }
  }

  getDisplayableMessage() {
    if (this.warning === 'publishIdentity') {
      return this.translate.instant('identity.publish-identity-prompt');
    } else {
      return this.translate.instant('identity.publish-visibility-prompt');
    }
  }

  cancel() {
    void this.popover.dismiss();
  }

  confirmDelete() {
    void this.popover.dismiss({
      action: 'confirmDeleteCredentials'
    });
  }

  confirmPublishDID() {
    void this.popover.dismiss({
      action: 'publishDIDDocumentReal'
    });
  }

  confirmPublishVisibility() {
    void this.popover.dismiss({
      action: 'publishDIDDocumentReal'
    });
  }
}
