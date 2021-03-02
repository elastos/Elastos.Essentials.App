import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class PopupProvider {
    constructor(public alertCtrl: AlertController, public translate: TranslateService)
    {}

    public ionicAlert(title: string, subTitle?: string, okText?: string): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this.alertCtrl.create({
                header : this.translate.instant(title),
                subHeader: subTitle ? this.translate.instant(subTitle) : '',
                backdropDismiss: false,
                buttons: [{
                    text: okText ? okText : this.translate.instant('confirm'),
                    handler: () => {
                        console.log('ionicAlert Ok clicked');
                        resolve();
                    }
                }]
            }).then(alert => alert.present());
        });
    };


    public ionicConfirm(title: string, message: string, okText?: string, cancelText?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.alertCtrl.create({
                header: this.translate.instant(title),
                message  : this.translate.instant(message),
                buttons: [{
                    text: cancelText ? cancelText : this.translate.instant('cancel'),
                    handler: () => {
                        console.log('ionicConfirm Disagree clicked');
                        resolve(false);
                    }
                },
                {
                    text: okText ? okText : this.translate.instant('confirm'),
                    handler: () => {
                        console.log('Agree clicked');
                        resolve(true);
                    }
                }]
            }).then(confirm => confirm.present());
        });
    };

    public ionicPrompt(title: string, message: string, opts?: any, okText?: string, cancelText?: string): Promise<any> {
        return new Promise((resolve, reject) => {
        let defaultText = opts && opts.defaultText ? opts.defaultText : null;
        let placeholder = opts && opts.placeholder ? opts.placeholder : null;
        let inputType = opts && opts.type ? opts.type : 'text';
        let cssClass = opts.useDanger ? "alertDanger" : null;
        let backdropDismiss = !!opts.backdropDismiss;

        this.alertCtrl.create({
            header:title,
            message,
            cssClass,
            backdropDismiss,
            inputs: [{
                value: defaultText,
                placeholder,
                type: inputType
            }],
            buttons: [{
                text: cancelText ? cancelText : this.translate.instant('Cancel'),
                handler: data => {
                    console.log('Cancel clicked');
                    resolve(null);
                }
            },
            {
                text: okText ? okText : this.translate.instant('Ok'),
                handler: data => {
                    console.log('Saved clicked');
                    resolve(data[0]);
                }
            }]
            }).then(prompt => prompt.present());
        });
    }
}
