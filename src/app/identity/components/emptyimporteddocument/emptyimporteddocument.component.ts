import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';

import { Native } from '../../services/native';

export enum EmptyImportedDocumentChoice {
  CreateNewProfile,
  Cancel
}

@Component({
  selector: 'emptyimporteddocument',
  templateUrl: './emptyimporteddocument.component.html',
  styleUrls: ['./emptyimporteddocument.component.scss'],
})
export class EmptyImportedDocumentComponent implements OnInit {
  constructor(public modalCtrl: ModalController, 
              public native: Native) { 
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
  }

  createEmptyProfile() {
    this.submit(EmptyImportedDocumentChoice.CreateNewProfile);
  }

  cancel() {
    this.submit(EmptyImportedDocumentChoice.Cancel);
  }

  submit(action: EmptyImportedDocumentChoice) {
    this.modalCtrl.dismiss({
      action: action
    });
  }
}
