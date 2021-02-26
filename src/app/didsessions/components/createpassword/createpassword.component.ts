import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';

import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'createpassword',
  templateUrl: './createpassword.component.html',
  styleUrls: ['./createpassword.component.scss'],
})
export class CreatePasswordComponent implements OnInit {
  @ViewChild('pwd',{static:false}) pwd: IonInput;

  public password: string = "";
  public passwordConfirmation: string = "";
  public changePassword: true;
  public title = 'createpassword-intro';

  constructor(
    public modalCtrl: ModalController,
    public theme: GlobalThemeService
  ) {
  }

  ngOnInit() {
    if (this.changePassword) this.title = 'changepassword-info';
  }

  ionViewDidEnter() {
    this.pwd.setFocus();
  }

  passwordsMatch() {
    // TODO: more check such as password size and special characters.
    return this.password == this.passwordConfirmation;
  }

  setDelayedFocus(element) {
    setTimeout(()=>{
      element.setFocus();
    }, 1000);
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

    console.log("Password is ok, submitting to caller.");

    this.modalCtrl.dismiss({
      password: this.password
    });
  }
}
