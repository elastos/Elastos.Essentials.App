import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
})
export class SuccessComponent implements OnInit {

  constructor(
    private popoverCtrl: PopoverController,
    public theme: GlobalThemeService,
    public translate: TranslateService
  ) { }

  ngOnInit() {}

  continue() {
    this.popoverCtrl.dismiss();
  }

}
