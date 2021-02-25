import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { ThemeService } from 'src/app/services/theme.service';

export enum ImportDIDSource {
    ImportFromMnemonic,
    ImportFromWalletApp
};

@Component({
  selector: 'importdidsource',
  templateUrl: './importdidsource.component.html',
  styleUrls: ['./importdidsource.component.scss'],
})
export class ImportDIDSourceComponent implements OnInit {

  constructor(
    public modalCtrl: ModalController,
    public uxService: UXService,
    public theme: ThemeService
  ) {}

  ngOnInit() {
  }

  ionViewDidEnter() {
  }

  ionViewWillEnter() {
  }

  public importFromMnemonic() {
    this.submit(ImportDIDSource.ImportFromMnemonic);
  }

  public importFromWalletApp() {
    this.submit(ImportDIDSource.ImportFromWalletApp);
  }

  submit(source: ImportDIDSource) {
    this.modalCtrl.dismiss({
      source: source
    });
  }
}
