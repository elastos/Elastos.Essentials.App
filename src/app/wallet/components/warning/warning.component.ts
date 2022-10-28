import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {
  public title = '';
  public message = '';

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService
  ) { }

  ngOnInit() {
    this.title = this.navParams.get('title');
    this.message = this.navParams.get('message');
  }

  cancel() {
    void this.popoverCtrl.dismiss();
  }

  delete() {
    void this.popoverCtrl.dismiss({ confirm: true });
  }
}
