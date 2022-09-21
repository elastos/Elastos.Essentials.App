import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-printoptions',
  templateUrl: './printoptions.component.html',
  styleUrls: ['./printoptions.component.scss'],
})
export class PrintoptionsComponent implements OnInit {
  constructor(
    public theme: GlobalThemeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() { }

  print(qrCode: boolean, mnemonicWords: boolean) {
    this.modalCtrl.dismiss({
      printQRCode: qrCode,
      printMnemonicWords: mnemonicWords,
    })
  }
}
