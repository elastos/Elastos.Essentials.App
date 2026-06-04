import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DIDService } from '../../services/did.service';

@Component({
  selector: 'app-publish-did',
  templateUrl: './publish-did.component.html',
  styleUrls: ['./publish-did.component.scss'],
})
export class PublishDIDComponent implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    public didService: DIDService,
    private popover: PopoverController,
    public translate: TranslateService,
  ) { }

  ngOnInit() {
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
