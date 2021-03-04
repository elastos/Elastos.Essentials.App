import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-tx-success',
  templateUrl: './tx-success.component.html',
  styleUrls: ['./tx-success.component.scss'],
})
export class TxSuccessComponent implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public popover: PopoverController
  ) { }

  ngOnInit() {}

  continue() {
    this.popover.dismiss();
  }
}
