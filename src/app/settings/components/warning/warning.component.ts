import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class SettingsWarningComponent implements OnInit {
  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
  }

  cancel() {
    this.popoverCtrl.dismiss();
  }

  confirm() {
    this.popoverCtrl.dismiss({
      confirm: true
    });
  }
}
