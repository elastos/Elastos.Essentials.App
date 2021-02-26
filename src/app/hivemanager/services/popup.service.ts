import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class PopupService {

    public alert = null;

    constructor(
        public alertCtrl: AlertController,
        public translate: TranslateService,
        private toastCtrl: ToastController
    )
    {}

    public toast(message: string = '', duration: number = 2000) {
        message = this.translate.instant(message);
        this.toastCtrl.create({
            mode: 'ios',
            color: 'primary',
            position: 'bottom',
            header: message,
            duration: duration,
        }).then(toast => toast.present());
    }

    public ionicAlert(
        title: string,
        subTitle?: string,
        okText: string = 'alert.confirm'
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            this.alert = null;
            this.alert = this.alertCtrl.create({
                mode: 'ios',
                header : this.translate.instant(title),
                subHeader: subTitle ? this.translate.instant(subTitle) : '',
                backdropDismiss: false,
                buttons: [{
                    text: this.translate.instant(okText),
                    handler: () => {
                        console.log('ionicAlert Ok clicked');
                        resolve();
                    }
                }]
            }).then(alert => alert.present());
        });
    };


    public ionicConfirm(
        title: string,
        message: string,
        okText: string = "alert.confirm",
        cancelText: string = "alert.cancel"
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.alert = null;
            this.alert = this.alertCtrl.create({
                mode: 'ios',
                header: this.translate.instant(title),
                message  : this.translate.instant(message),
                buttons: [{
                    text: this.translate.instant(cancelText),
                    handler: () => {
                        console.log('ionicConfirm Disagree clicked');
                        resolve(false);
                    }
                },
                {
                    text: this.translate.instant(okText),
                    handler: () => {
                        console.log('Agree clicked');
                        resolve(true);
                    }
                }]
            }).then(confirm => confirm.present());
        });
    };

    public ionicPrompt(
        title: string,
        message: string,
        opts?: any,
        okText: string = 'alert.okay',
        cancelText: string = 'alert.cancel'
    ): Promise<any> {
        return new Promise((resolve, reject) => {
        let defaultText = opts && opts.defaultText ? opts.defaultText : null;
        let placeholder = opts && opts.placeholder ? opts.placeholder : null;
        let inputType = opts && opts.type ? opts.type : 'text';
        let cssClass = opts.useDanger ? "alertDanger" : null;
        let backdropDismiss = !!opts.backdropDismiss;

        this.alert = null;
        this.alert = this.alertCtrl.create({
            mode: 'ios',
            header: title,
            message,
            cssClass,
            backdropDismiss,
            inputs: [{
                value: defaultText,
                placeholder,
                type: inputType
            }],
            buttons: [{
                text: this.translate.instant(cancelText),
                handler: data => {
                    console.log('Cancel clicked');
                    resolve(null);
                }
            },
            {
                text: this.translate.instant(okText),
                handler: data => {
                    console.log('Saved clicked');
                    resolve(data[0]);
                }
            }]
            }).then(prompt => prompt.present());
        });
    }
}
