import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { DIDService } from '../../services/did.service';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {

  warning: string = "";
  password: string = "";

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
    if(this.warning === 'publishIdentity') {
      return this.translate.instant('identity.publish-identity');
    } else {
      return this.translate.instant('identity.publish-visibility');
    }
  }

  getDisplayableMessage() {
    if(this.warning === 'publishIdentity') {
      return this.translate.instant('identity.publish-identity-prompt');
    } else {
      return this.translate.instant('identity.publish-visibility-prompt');
    }
  }

  cancel() {
    this.popover.dismiss();
  }

  confirmDelete() {
    this.popover.dismiss({
      action: 'confirmDeleteCredentials'
    });
  }

  confirmPublishDID() {
    this.popover.dismiss({
      action: 'publishDIDDocumentReal'
    });
  }

  confirmPublishVisibility() {
    this.popover.dismiss({
      action: 'publishDIDDocumentReal'
    });
  }
}
