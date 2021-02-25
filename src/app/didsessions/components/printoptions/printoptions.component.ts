import { Component, OnInit } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-printoptions',
  templateUrl: './printoptions.component.html',
  styleUrls: ['./printoptions.component.scss'],
})
export class PrintoptionsComponent implements OnInit {

  constructor(
    public theme: ThemeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {}

  print(qrCode: boolean, mnemonicWords: boolean) {
    this.modalCtrl.dismiss({
      printQRCode: qrCode,
      printMnemonicWords: mnemonicWords,
    })
  }
}
