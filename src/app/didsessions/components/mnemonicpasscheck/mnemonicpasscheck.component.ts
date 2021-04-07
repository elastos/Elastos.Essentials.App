import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'mnemonicpasscheck',
  templateUrl: './mnemonicpasscheck.component.html',
  styleUrls: ['./mnemonicpasscheck.component.scss'],
})
export class MnemonicPassCheckComponent implements OnInit {
  @ViewChild('pwd',{static:false}) pwd: IonInput;

  public askedIfHasPassphrase: boolean = false;
  public password: string = "";
  public passwordConfirmation: string = "";

  constructor(
    public modalCtrl: ModalController,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
  }

  passwordsMatch() {
    return this.password == this.passwordConfirmation;
  }

  setDelayedFocus(element) {
    setTimeout(()=>{
      element.setFocus();
    }, 1000);
  }

  /**
   * User said he has a passphrase. So we want to ask him which one.
   */
  hasPassphrase() {
    this.askedIfHasPassphrase = true;

    setTimeout(()=>{
      this.pwd.setFocus();
    }, 500);
  }

  noPassphrase() {
    this.modalCtrl.dismiss({
      password: this.password
    });
  }

  /**
   * Move text input focus to the given item
   */
  moveFocus(element, event: KeyboardEvent) {
    if (event.keyCode == 13) {  // Return
      element.setFocus();
    }
  }

  canSave() {
    return this.password != "" && this.passwordsMatch();
  }

  submit() {
    if (!this.canSave())
      return;

    Logger.log('didsessions', "Password is ok, submitting to caller.");
    this.modalCtrl.dismiss({
      password: this.password
    });
  }
}
