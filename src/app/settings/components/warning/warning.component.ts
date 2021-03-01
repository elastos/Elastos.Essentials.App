import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class SettingsWarningComponent implements OnInit {
  constructor(
    public theme: ThemeService,
    private navParams: NavParams,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
  }

  cancel() {
    this.popoverCtrl.dismiss();
  }

  deleteApp() {
    this.popoverCtrl.dismiss({
      deleteApp: true
    });
  }
}
