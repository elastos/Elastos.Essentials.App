import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DIDService } from '../../services/did.service';

@Component({
  selector: 'app-publish-did',
  templateUrl: './publish-did.component.html',
  styleUrls: ['./publish-did.component.scss'],
})
export class PublishDIDComponent implements OnInit {
  warning = "";

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
  }

  getDisplayableHeader() {
    return this.translate.instant('identity.publish-identity');
  }

  getDisplayableMessage() {
    return this.translate.instant('identity.publish-identity-prompt');
  }

  cancel() {
    void this.popover.dismiss({
      confirmed: false
    });
  }

  confirmPublishDID() {
    void this.popover.dismiss({
      confirmed: true
    });
  }
}
