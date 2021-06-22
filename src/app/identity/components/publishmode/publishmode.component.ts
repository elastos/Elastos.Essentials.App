import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-publishmode',
  templateUrl: './publishmode.component.html',
  styleUrls: ['./publishmode.component.scss'],
})
export class PublishModeComponent implements OnInit {
  constructor(
    public theme: GlobalThemeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {}

  useAssist() {
    void this.modalCtrl.dismiss({
      using: "assist"
    });
  }

  useWallet() {
    void this.modalCtrl.dismiss({
      using: "wallet"
    });
  }
}
