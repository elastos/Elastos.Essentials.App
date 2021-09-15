import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-restart-prompt',
  templateUrl: './restart-prompt.component.html',
  styleUrls: ['./restart-prompt.component.scss'],
})
export class RestartPromptComponent implements OnInit {
  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
  }

  cancel() {
    void this.popoverCtrl.dismiss();
  }

  confirm() {
    void this.popoverCtrl.dismiss({
      confirm: true
    });
  }
}
