import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NativeService {

  constructor(
    private toastCtrl: ToastController
  ) { }

  genericToast(msg: string, duration: number = 2000) {
    this.toastCtrl.create({
        header: msg,
        color: 'primary',
        duration: duration,
        position: 'bottom'
    }).then(toast => toast.present());
  }
}
