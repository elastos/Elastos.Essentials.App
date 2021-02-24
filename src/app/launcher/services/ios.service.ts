import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root'
})
export class IosService {
    public iosApps;

    constructor(private translate: TranslateService) {
    }

    public init() {
        console.log("IOS Service is initializing home screen items with language:", this.translate.currentLang);

        console.log("IOS TEST", this.translate.instant('app-wallet'));

        this.iosApps = [
            {
                type: 'main',
                apps: [
                    {
                        cssId: 'Wallet',
                        name: this.translate.instant('app-wallet'),
                        description: this.translate.instant('app-wallet-description'),
                        icon: '/assets/launcher/ios/app-icons/wallet.svg',
                        id: 'org.elastos.trinity.dapp.wallet'
                    },
                    {
                        cssId: 'Identity',
                        name: this.translate.instant('app-identity'),
                        description: this.translate.instant('app-identity-description'),
                        icon: '/assets/launcher/ios/app-icons/identity.svg',
                        id: 'org.elastos.trinity.dapp.did'
                    },
                    {
                        cssId: 'Contacts',
                        name: this.translate.instant('app-contacts'),
                        description: this.translate.instant('app-contacts-description'),
                        icon: '/assets/launcher/ios/app-icons/contacts.svg',
                        id: 'org.elastos.trinity.dapp.friends'
                    },
                ]
            },
            {
                type: 'utilities',
                apps: [
                    {
                        cssId: 'Hive',
                        name: this.translate.instant('app-hive'),
                        description: this.translate.instant('app-hive-description'),
                        icon: '/assets/launcher/ios/app-icons/hive.svg',
                        id: 'org.elastos.trinity.dapp.hivemanager'
                    },
                    {
                        cssId: 'Passwords',
                        name: this.translate.instant('app-passwords'),
                        description: this.translate.instant('app-passwords-description'),
                        icon: '/assets/launcher/ios/app-icons/password.svg',
                        id: 'org.elastos.trinity.dapp.passwordmanager'
                    },
                ]
            },
            {
                type: 'other',
                apps: [
                    {
                        cssId: 'Scanner',
                        name: this.translate.instant('app-scanner'),
                        description: this.translate.instant('app-scanner-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        id: 'org.elastos.trinity.dapp.qrcodescanner'
                    },
                    {
                        cssId: 'Settings',
                        name: this.translate.instant('app-settings'),
                        description: this.translate.instant('app-settings-description'),
                        icon: '/assets/launcher/ios/app-icons/settings.svg',
                        id: 'org.elastos.trinity.dapp.settings'
                    },
                ]
            }
        ];
    }
}
