import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Injectable()
export class PopupService {

    public alert = null;

    constructor(
        public alertCtrl: AlertController,
        public translate: TranslateService,
        private globalNative: GlobalNativeService
    )
    {}

    public toast(msg: string = '', duration: number = 2000) {
        this.globalNative.genericToast(msg, duration);
    }

    public ionicAlert(
        title: string,
        subTitle?: string,
        okText: string = 'hivemanager.alert.confirm'
    ): Promise<void> {
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
                        Logger.log('HiveManager', 'ionicAlert Ok clicked');
                        this.alert = null;
                        resolve();
                    }
                }]
            }).then(alert => alert.present());
        });
    };


    public ionicConfirm(
        title: string,
        message: string,
        okText: string = 'hivemanager.alert.confirm',
        cancelText: string = 'hivemanager.alert.cancel'
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
                        Logger.log('HiveManager', 'ionicConfirm Disagree clicked');
                        this.alert = null;
                        resolve(false);
                    }
                },
                {
                    text: this.translate.instant(okText),
                    handler: () => {
                        Logger.log('HiveManager', 'Agree clicked');
                        this.alert = null;
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
        okText: string = 'hivemanager.alert.okay',
        cancelText: string = 'hivemanager.alert.cancel'
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
                    Logger.log('HiveManager', 'Cancel clicked');
                    this.alert = null;
                    resolve(null);
                }
            },
            {
                text: this.translate.instant(okText),
                handler: data => {
                    Logger.log('HiveManager', 'Saved clicked');
                    this.alert = null;
                    resolve(data[0]);
                }
            }]
            }).then(prompt => prompt.present());
        });
    }
}
