import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-restart-prompt',
  templateUrl: './restart-prompt.component.html',
  styleUrls: ['./restart-prompt.component.scss'],
})
export class RestartPromptComponent implements OnInit {
  public canCancel = false;

  constructor(
    public theme: GlobalThemeService,
    private navParams: NavParams,
    private popoverCtrl: PopoverController,
  ) {
    this.canCancel = this.navParams.get('showCancel') || false;
  }

  ngOnInit() {

  }

  public cancel() {
    void this.popoverCtrl.dismiss();
  }

  public confirm() {
    void this.popoverCtrl.dismiss({
      confirm: true
    });
  }
}
