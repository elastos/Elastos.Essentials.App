import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import { Logger } from 'src/app/logger';

@Injectable({
    providedIn: 'root'
})
export class PopupProvider {

    public alertPopup: any = null;

    constructor(
        public alertCtrl: AlertController,
        private translate: TranslateService,
    ) { }

    public ionicAlert(title: string, subTitle?: string, okText?: string): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: subTitle ? this.translate.instant(subTitle) : '',
                backdropDismiss: false,
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: okText ? this.translate.instant(okText) : this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'ionicAlert Ok clicked');
                            this.alertPopup = null;
                            resolve();
                        }
                    }
                ]
            }).then(alert => alert.present());
        });
    }

    public ionicAlert_data(
        title: string,
        subTitle?: string,
        amount?: any,
        okText?: string
    ): Promise<any> {
        const suggestAmount = this.translate.instant('wallet.suggest-amount');
        return new Promise<void>((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: this.translate.instant(subTitle) + "(" + suggestAmount + amount + ")",
                backdropDismiss: false,
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: okText ? okText : this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'ionicAlert_data Ok clicked');
                            this.alertPopup = null;
                            resolve();
                        }
                    }
                ]
            }).then(alert => alert.present());
        });
    }

    public ionicAlert_delTx(
        title: string,
        subTitle?: string,
        hash?: any,
        okText?: string
    ): Promise<any> {
        const transactionDeleted = this.translate.instant('wallet.transaction-deleted');
        return new Promise<void>((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: "txHash:" + "(" + hash + ")" + ":" + transactionDeleted,
                backdropDismiss: false,
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: okText ? okText : this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'ionicAlert_delTx Ok clicked');
                            this.alertPopup = null;
                            resolve();
                        }
                    }
                ]
            }).then(alert => alert.present());
        });
    }

    public ionicAlert_PublishedTx_fail(
        title: string,
        subTitle?: string,
        hash?: string,
        failDetail?: string,
        okText?: string
    ): Promise<any> {
        const sub = this.translate.instant(subTitle);
        const reason = this.translate.instant('wallet.reasons-failure');
        return new Promise<void>((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: reason + ':' + sub,
                backdropDismiss: false,
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: okText ? okText : this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'ionicAlert_PublishedTx_fail Ok clicked');
                            this.alertPopup = null;
                            resolve();
                        }
                    }
                ]
            }).then(alert => alert.present());
        });
    }

    public ionicAlert_PublishedTx_sucess(
        title: string,
        subTitle?: string,
        hash?: any,
        okText?: string
    ): Promise<any> {
        const sub = this.translate.instant(subTitle);
        return new Promise<void>((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: sub + "<br/>" + "(" + "txHash:" + hash + ")",
                backdropDismiss: false,
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: okText ? okText : this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'ionicAlert_PublishedTx_sucess Ok clicked');
                            this.alertPopup = null;
                            resolve();
                        }
                    }
                ]
            }).then(alert => alert.present());
        });
    }

    // TODO: don't use a promise, use 2 callbacks here, "confirmed" and "cancelled"
    public ionicConfirm(
        title: string,
        message: string,
        okText: string = "common.confirm",
        cancelText: string = "common.cancel"
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            this.alertPopup = null;
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                message: this.translate.instant(message),
                cssClass: 'alert',
                backdropDismiss: false,
                mode: 'ios',
                buttons: [
                    {
                        text: this.translate.instant(cancelText),
                        handler: () => {
                            Logger.log('wallet', 'ionicConfirm Disagree clicked');
                            this.alertPopup = null;
                            resolve(false);
                        }
                    },
                    {
                        text: this.translate.instant(okText),
                        handler: () => {
                            Logger.log('wallet', 'Agree clicked');
                            this.alertPopup = null;
                            resolve(true);
                        }
                    }
                ]
            }).then(confirm => confirm.present());
        });
    }

    // TODO: don't use a promise, use 2 callbacks here, "confirmed" and "cancelled"
    public ionicConfirmWithSubTitle(title: string, subTitle: string, message: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.alertPopup = this.alertCtrl.create({
                header: this.translate.instant(title),
                subHeader: subTitle,
                message: this.translate.instant(message),
                cssClass: 'alert',
                mode: 'ios',
                buttons: [
                    {
                        text: this.translate.instant('common.cancel'),
                        handler: () => {
                            Logger.log('wallet', 'ionicConfirm Disagree clicked');
                            this.alertPopup = null;
                            resolve(false);
                        }
                    },
                    {
                        text: this.translate.instant('common.confirm'),
                        handler: () => {
                            Logger.log('wallet', 'Agree clicked');
                            this.alertPopup = null;
                            resolve(true);
                        }
                    }
                ]
            }).then(confirm => confirm.present());
        });
    }

    // TODO: don't use a promise, use 2 callbacks here, "confirmed" and "cancelled"
    public ionicPrompt(
        title: string,
        message: string,
        opts?: any,
        okText?: string,
        cancelText?: string
    ): Promise<boolean> {
        opts = opts || {};

        return new Promise((resolve, reject) => {
            let defaultText = opts && opts.defaultText ? opts.defaultText : null;
            let placeholder = opts && opts.placeholder ? opts.placeholder : null;
            let inputType = opts && opts.type ? opts.type : 'text';
            let cssClass = opts.useDanger ? "alertDanger" : null;
            let backdropDismiss = !!opts.backdropDismiss;

            this.alertPopup = this.alertCtrl.create({
                header: title,
                message,
                /*cssClass,
                backdropDismiss,
                inputs: [
                  {
                    value: defaultText,
                    placeholder,
                    type: inputType
                  },
                ],*/
                mode: 'ios',
                buttons: [
                    {
                        text: cancelText ? cancelText : this.translate.instant('common.cancel'),
                        handler: data => {
                            Logger.log('wallet', 'Cancel clicked');
                            this.alertPopup = null;
                            resolve(false);
                        }
                    },
                    {
                        text: okText ? okText : this.translate.instant('common.ok'),
                        handler: data => {
                            Logger.log('wallet', 'Ok clicked');
                            this.alertPopup = null;
                            resolve(true);
                        }
                    }
                ]
            }).then(prompt => {
                void prompt.present();
            });
        });
    }
}
