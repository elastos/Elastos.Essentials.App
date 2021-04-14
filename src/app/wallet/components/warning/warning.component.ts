import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    public translate: TranslateService
  ) { }

  ngOnInit() {
  }

  cancel() {
    this.popoverCtrl.dismiss();
  }

  delete() {
    this.popoverCtrl.dismiss({ delete: true });
  }
}
